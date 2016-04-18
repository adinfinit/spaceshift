package spaceshift

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/loov/spaceshift/spaceshift/g"
)

type ID string

type State struct {
	Input   map[ID]Input `json:"input"`
	Ships   map[ID]*Ship `json:"ships"`
	Bullets []*Bullet    `json:"bullets"`
}

func (cur *State) Clone() *State {
	next := &State{
		Input:   make(map[ID]Input, len(cur.Input)),
		Ships:   make(map[ID]*Ship, len(cur.Ships)),
		Bullets: make([]*Bullet, 0, len(cur.Bullets)),
	}

	for id, input := range cur.Input {
		next.Input[id] = input
	}
	for id, ship := range cur.Ships {
		x := *ship
		next.Ships[id] = &x
	}
	//for _, bullet := range current.Bullets {
	//	x := *bullet
	//	next.Bullets[id] = &x
	//
	//}

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
			Input: make(map[ID]Input),
			Ships: make(map[ID]*Ship),
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
	}
	world.Active.Input[ship.ID] = Input{
		Thrust: 1,
		Turn:   1,
	}
	world.Active.Ships[ship.ID] = ship
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

	for _, ship := range state.Ships {
		ship.Update(dt, state.Input[ship.ID])
	}
	for _, bullet := range state.Bullets {
		bullet.Update(dt)
	}
}

type Input struct {
	ID     ID
	Turn   float64 // -1, 1
	Thrust float64 // -1, 1
	Fire   bool
}

type Ship struct {
	ID          ID      `json:"id"`
	Orientation float64 `json:"orientation"`
	Position    g.V2    `json:"position"`
	Velocity    g.V2    `json:"velocity"`
	Force       g.V2    `json:"force"`
	Mass        float64 `json:"mass"`
}

func (ship *Ship) Update(dt float64, input Input) {
	ship.Force = g.V2{}

	ship.Orientation += g.Tau * g.U(input.Turn) * dt

	ship.Force.X = -10000 * g.U(input.Thrust) * g.Cos(ship.Orientation)
	ship.Force.Y = -10000 * g.U(input.Thrust) * g.Sin(ship.Orientation)

	ship.Velocity.X += dt * ship.Force.X / ship.Mass
	ship.Velocity.Y += dt * ship.Force.Y / ship.Mass

	ship.Velocity.X *= 0.99
	ship.Velocity.Y *= 0.99

	ship.Position.X += dt * ship.Velocity.X
	ship.Position.Y += dt * ship.Velocity.Y
}

type Bullet struct {
	ID int64

	Orientation float32
	Position    g.V2
	Velocity    g.V2
}

func (bullet *Bullet) Update(dt float64) {
	//
}
