package main

import (
	"flag"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/net/websocket"

	"github.com/loov/spaceshift/spaceshift"
)

var (
	addr      = flag.String("listen", ":8000", "http server `address`")
	assetsdir = flag.String("assets", "assets", "assets `directory`")
	conffile  = flag.String("config", "chatter.toml", "farm configuration")
)

func main() {
	flag.Parse()

	host, port := os.Getenv("HOST"), os.Getenv("PORT")
	if host != "" || port != "" {
		*addr = host + ":" + port
	}

	server := NewServer()

	http.Handle("/vendor/", http.StripPrefix("/vendor/", http.FileServer(http.Dir("vendor"))))
	http.Handle("/spaceshift/", http.StripPrefix("/spaceshift/", http.FileServer(http.Dir("spaceshift"))))
	http.Handle("/", server)

	log.Printf("Starting on %s", *addr)
	go func() {
		log.Fatal(http.ListenAndServe(*addr, nil))
	}()

	ch := make(chan os.Signal)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
}

type Server struct {
	World *spaceshift.World

	socket http.Handler
}

func NewServer() *Server {
	server := &Server{}
	server.World = spaceshift.NewWorld()

	server.World.SpawnAI()
	server.World.SpawnAI()

	go server.World.Run()

	server.socket = websocket.Handler(server.live)
	return server
}

type Message struct {
	Type string
	Data interface{}
}

func (s *Server) live(conn *websocket.Conn) {
	log.Printf("JOIN: %v\n", conn.RemoteAddr())
	defer log.Printf("LEAVE: %v\n", conn.RemoteAddr())
	defer conn.Close()

	id := s.World.SpawnPlayer()
	websocket.JSON.Send(conn, &Message{
		Type: "welcome",
		Data: id,
	})

	time.Sleep(time.Second)

	// in
	go func() {
		for {
			var input spaceshift.Input
			err := websocket.JSON.Receive(conn, &input)
			if err != nil {
				log.Println("READ ERROR:", conn, err)
				break
			}

			input.ID = id
			s.World.AddInput(input)
		}
	}()

	var prev *spaceshift.State
	for {
		next := s.World.Last.Load().(*spaceshift.State)
		if prev == next {
			time.Sleep(time.Millisecond)
			continue
		}
		prev = next
		err := websocket.JSON.Send(conn, &Message{"sync", next})
		if err != nil {
			log.Println("WRITE ERROR:", conn, err)
			break
		}
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/", "":
		t, err := template.ParseFiles("index.html")
		if err != nil {
			log.Println(err)
			http.Error(w, "bad index.html; no cookies for you", http.StatusInternalServerError)
			return
		}

		err = t.Execute(w, nil)
		if err != nil {
			log.Println(err)
		}
	case "/live":
		s.socket.ServeHTTP(w, r)
	default:
		http.NotFound(w, r)
	}
}
