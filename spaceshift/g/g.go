package g

import (
	"math"
	"math/rand"
)

const Tau = 2 * math.Pi

type V2 struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

func R(low, high float64) float64 {
	return (high-low)*rand.Float64() + low
}

func U(v float64) float64 {
	if v < -1 {
		return -1
	}
	if v > 1 {
		return 1
	}
	return v
}

func (a V2) Neg() V2 { return V2{-a.X, -a.Y} }

func (a V2) Add(b V2) V2        { return V2{a.X + b.X, a.Y + b.Y} }
func (a V2) Sub(b V2) V2        { return V2{a.X - b.X, a.Y - b.Y} }
func (a V2) Scale(s float64) V2 { return V2{a.X * s, a.Y * s} }

func (a V2) Len() float64  { return math.Sqrt(a.X*a.X + a.Y*a.Y) }
func (a V2) Len2() float64 { return a.X*a.X + a.Y*a.Y }

func Dist(a, b V2) float64 { return a.Sub(b).Len() }

func Cos(v float64) float64 { return math.Cos(v) }
func Sin(v float64) float64 { return math.Sin(v) }
