package spaceshift

import (
	"fmt"
	"math"
	"sync"
	"sync/atomic"
	"time"

	"github.com/loov/spaceshift/spaceshift/g"
)

type ID string

type State struct {
	Input   map[ID]Input `json:"-"`
	Ships   map[ID]*Ship `json:"ships"`
	Bullets []*Bullet    `json:"bullets"`

	HalfSize g.V2 `json:"halfsize"`
}

func (cur *State) Clone() *State {
	next := &State{
		Input:    make(map[ID]Input, len(cur.Input)),
		Ships:    make(map[ID]*Ship, len(cur.Ships)),
		Bullets:  make([]*Bullet, 0, len(cur.Bullets)),
		HalfSize: cur.HalfSize,
	}

	for id, input := range cur.Input {
		next.Input[id] = input
	}
	for id, ship := range cur.Ships {
		x := *ship
		next.Ships[id] = &x
	}

	for _, bullet := range cur.Bullets {
		b := *bullet
		next.Bullets = append(next.Bullets, &b)
	}

	return next
}

type World struct {
	NextMu sync.Mutex
	Next   []Input

	Active *State
	Last   atomic.Value

	nextID int32
}

func NewWorld() *World {
	world := &World{
		Active: &State{
			Input:    make(map[ID]Input),
			Ships:    make(map[ID]*Ship),
			HalfSize: g.V2{200, 200},
		},
	}

	world.Last.Store(world.Active.Clone())
	return world
}

func (world *World) GrabID() ID {
	id := atomic.AddInt32(&world.nextID, 1)
	return ID(fmt.Sprintf("%v", id))
}

func (world *World) AddInput(input Input) {
	world.NextMu.Lock()
	world.Next = append(world.Next, input)
	world.NextMu.Unlock()
}

func (world *World) SpawnAI() {
	id := world.GrabID()

	ship := &Ship{
		ID: id,

		Orientation: g.R(0, g.Tau),
		Position:    g.V2{0, 0},
		Velocity:    g.V2{g.R(-10, 10), g.R(-10, 10)},
		Force:       g.V2{0, 0},
		Mass:        100,

		Energy:       1,
		Cooldown:     3,
		Invulnerable: 3,

		AI: true,
	}
	world.Active.Input[ship.ID] = Input{
		Thrust: 1,
		Turn:   1,
	}
	world.Active.Ships[ship.ID] = ship
}

func PlayerDefaults(id ID) Ship {
	return Ship{
		ID: id,

		Orientation: g.R(0, g.Tau),
		Position:    g.V2{0, 0},
		Velocity:    g.V2{0, 0},
		Force:       g.V2{0, 0},
		Mass:        100,

		Energy:       1,
		Cooldown:     1,
		Invulnerable: 3,
	}
}

func (world *World) SpawnPlayer() ID {
	id := world.GrabID()

	ship := PlayerDefaults(id)
	world.Active.Input[ship.ID] = Input{}
	world.Active.Ships[ship.ID] = &ship

	return id
}

func (world *World) RemovePlayer(id ID) {
	world.AddInput(Input{ID: id, Remove: true})
}

func (world *World) Run() {
	for range time.Tick(33 * time.Millisecond) {
		world.NextMu.Lock()
		inputs := world.Next
		world.Next = make([]Input, 0, 32)
		world.NextMu.Unlock()

		for _, input := range inputs {
			world.Active.Input[input.ID] = input
		}
		world.Update(0.033)

		world.Last.Store(world.Active.Clone())
	}
}

func (world *World) Update(dt float64) {
	state := world.Active

	ships := make([]*Ship, 0, len(state.Ships))
	for _, ship := range state.Ships {
		ship.ClearForces()
		ships = append(ships, ship)
	}

	for i, a := range ships {
		for _, b := range ships[i+1:] {
			delta := a.Position.Sub(b.Position)
			const R = 6
			if delta.Len() < R {
				if delta.Len() < 0.001 {
					delta = g.V2{1, 1}
				}
				delta = delta.Scale(R * 0.5 / delta.Len())
				a.Position = a.Position.Add(delta)
				b.Position = b.Position.Add(delta.Neg())

				a.Force = delta.Scale(10000)
				b.Force = delta.Scale(-10000)
			}
		}
	}

	remove := []ID{}
	for _, ship := range state.Ships {
		input := state.Input[ship.ID]
		if input.Remove {
			remove = append(remove, ship.ID)
		}
		ship.Update(dt, input, world)
	}
	for _, id := range remove {
		delete(state.Ships, id)
		delete(state.Input, id)
	}

	newbullets := state.Bullets[:0]
	for _, bullet := range state.Bullets {
		bullet.Update(dt)

		removebullet := false
		for _, ship := range state.Ships {
			if ship.ID == bullet.Shooter {
				continue
			}
			if g.Dist(ship.Position, bullet.Position) < 4 {
				ship.Energy -= 0.1
				removebullet = true
			}
		}

		if removebullet {
			shooter, ok := world.Active.Ships[bullet.Shooter]
			if ok {
				shooter.Points += 1
			}
			continue
		}

		if (math.Abs(bullet.Position.X) < state.HalfSize.X) &&
			(math.Abs(bullet.Position.Y) < state.HalfSize.Y) {
			newbullets = append(newbullets, bullet)
		}

	}
	state.Bullets = newbullets
}

type Input struct {
	ID     ID      `json:"id"`
	Turn   float64 `json:"turn"`   // -1, 1
	Thrust float64 `json:"thrust"` // -1, 1

	Fire bool `json:"fire"`
	Dash bool `json:"dash"`

	Remove bool `json:"-"`
}

type Ship struct {
	ID          ID      `json:"id"`
	Orientation float64 `json:"orientation"`
	Position    g.V2    `json:"position"`
	Velocity    g.V2    `json:"velocity"`
	Force       g.V2    `json:"force"`
	Mass        float64 `json:"mass"`

	AI bool `json:"ai"`

	Points       int64   `json:"points"`
	Energy       float64 `json:"energy"`       // 0..1
	Cooldown     float64 `json:"cooldown"`     // in seconds
	Invulnerable float64 `json:"invulnerable"` // in seconds

	Exploded   bool    `json:"exploded"`
	ResetAfter float64 `json:"-"`
}

func (ship *Ship) ClearForces() {
	ship.Force = g.V2{}
}

func (ship *Ship) IsInvulnerable() bool {
	return ship.Invulnerable > 0.0
}

func (ship *Ship) Reset() {
	next := PlayerDefaults(ship.ID)
	next.AI = ship.AI
	*ship = next
}

func (ship *Ship) Update(dt float64, input Input, world *World) {
	ship.Invulnerable -= dt
	ship.Cooldown -= dt

	if ship.Energy < 1 {
		ship.Energy += dt * 0.05
	}

	if ship.AI {
		ship.Energy -= dt * 0.2
	}

	if ship.Energy < 0 && !ship.Exploded {
		ship.Exploded = true
		ship.ResetAfter = 3
	}
	if ship.Exploded {
		ship.ResetAfter -= dt
		if ship.ResetAfter < 0 {
			ship.Reset()
			return
		}
		return
	}

	if ship.Cooldown < 0 {
		ship.Cooldown = 0
	}

	if ship.Cooldown <= 0 && input.Dash {
		dir := g.V2{g.Cos(ship.Orientation), g.Sin(ship.Orientation)}
		ship.Position = ship.Position.Add(dir.Scale(-50))
		ship.Cooldown += 0.5
	}
	if ship.Cooldown <= 0 && input.Fire {
		world.Active.Bullets = append(world.Active.Bullets, &Bullet{
			Shooter:  ship.ID,
			Position: ship.Position,
			Velocity: ship.Velocity.Add(g.V2{g.Cos(ship.Orientation), g.Sin(ship.Orientation)}.Scale(-100)),
		})
		ship.Cooldown += 0.1
	}

	ship.Orientation += g.Tau * g.U(input.Turn) * dt

	ship.Force.X += -10000 * g.U(input.Thrust) * g.Cos(ship.Orientation)
	ship.Force.Y += -10000 * g.U(input.Thrust) * g.Sin(ship.Orientation)

	ship.Velocity.X += dt * ship.Force.X / ship.Mass
	ship.Velocity.Y += dt * ship.Force.Y / ship.Mass

	ship.Velocity.X *= 0.99
	ship.Velocity.Y *= 0.99

	ship.Position.X += dt * ship.Velocity.X
	ship.Position.Y += dt * ship.Velocity.Y
}

type Bullet struct {
	Shooter  ID   `json:"shooter"`
	Position g.V2 `json:"position"`
	Velocity g.V2 `json:"velocity"`
}

func (bullet *Bullet) Update(dt float64) {
	bullet.Position.X += dt * bullet.Velocity.X
	bullet.Position.Y += dt * bullet.Velocity.Y
}
