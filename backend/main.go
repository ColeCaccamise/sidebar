package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/colecaccamise/go-backend/api"
	"github.com/colecaccamise/go-backend/storage"
	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("Starting server...")

	listenAddr := flag.String("listenAddr", ":8000", "The server address to listen on.")
	flag.Parse()

	if _, err := os.Stat(".env"); os.IsNotExist(err) {
		log.Printf("No .env file found, skipping...")
	} else {
		err := godotenv.Load()
		if err != nil {
			log.Printf("%v\n", err.Error())
			log.Fatalf("Error loading .env file")
		}
	}

	store, err := storage.NewPostgresStore()
	if err != nil {
		log.Fatalf("Error creating postgres store: %s", err.Error())
	}

	err = store.Init()
	if err != nil {
		log.Fatalf("Error initializing postgres store: %s", err.Error())
	}

	server := api.NewServer(*listenAddr, store)

	// todo initiate cron tasks

	log.Fatal(server.Start())
}
