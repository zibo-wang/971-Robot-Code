// This binary lets users interact with the scouting web server in order to
// debug it. Run with `--help` to see all the options.

package main

import (
	"flag"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/frc971/971-Robot-Code/scouting/webserver/requests/debug"
)

// Returns the absolute path of the specified path. This is an unwrapped
// version of `filepath.Abs`.
func absPath(path string) string {
	result, err := filepath.Abs(path)
	if err != nil {
		log.Fatal("Failed to determine absolute path for ", path, ": ", err)
	}
	return result
}

// Parses the specified JSON file into a binary version (i.e. serialized
// flatbuffer). This uses the `flatc` binary and the JSON's corresponding
// `.fbs` file.
func parseJson(fbsPath string, jsonPath string) []byte {
	// Work inside a temporary directory since `flatc` doesn't allow us to
	// customize the name of the output file.
	dir, err := ioutil.TempDir("", "webserver_debug_cli")
	if err != nil {
		log.Fatal("Failed to create temporary directory: ", err)
	}
	defer os.RemoveAll(dir)

	// Turn these paths absolute so that it everything still works from
	// inside the temporary directory.
	absFlatcPath := absPath("external/com_github_google_flatbuffers/flatc")
	absFbsPath := absPath(fbsPath)

	// Create a symlink to the .fbs file so that the output filename that
	// `flatc` generates is predictable. I.e. `fb.json` gets serialized
	// into `fb.bin`.
	jsonSymlink := filepath.Join(dir, "fb.json")
	os.Symlink(jsonPath, jsonSymlink)

	// Execute the `flatc` command.
	flatcCommand := exec.Command(absFlatcPath, "--binary", absFbsPath, jsonSymlink)
	flatcCommand.Dir = dir
	err = flatcCommand.Run()
	if err != nil {
		log.Fatal("Failed to execute flatc: ", err)
	}

	// Read the serialized flatbuffer and return it.
	binaryPath := filepath.Join(dir, "fb.bin")
	binaryFb, err := os.ReadFile(binaryPath)
	if err != nil {
		log.Fatal("Failed to read flatc output ", binaryPath, ": ", err)
	}
	return binaryFb
}

func main() {
	// Parse command line arguments.
	addressPtr := flag.String("address", "http://localhost:8080",
		"The end point where the server is listening.")
	submitDataScoutingPtr := flag.String("submitDataScouting", "",
		"If specified, parse the file as a SubmitDataScouting JSON request.")
	flag.Parse()

	// Handle the actual arguments.
	if *submitDataScoutingPtr != "" {
		log.Printf("Sending SubmitDataScouting to %s", *addressPtr)
		binaryRequest := parseJson(
			"scouting/webserver/requests/messages/submit_data_scouting.fbs",
			*submitDataScoutingPtr)
		response, err := debug.SubmitDataScouting(*addressPtr, binaryRequest)
		if err != nil {
			log.Fatal("Failed SubmitDataScouting: ", err)
		}
		log.Printf("%+v", response)
	}
}