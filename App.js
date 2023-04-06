import React, { useState,useEffect } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { openDatabase } from "expo-sqlite";

const db = openDatabase("final_exam.db");

export default function App() {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [recording, setRecording] = useState(null);
  const [audioURI, setAudioURI] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, });
  }, []);


  const initDB = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, imageURI TEXT, audioURI TEXT, caption TEXT)"
      );
    });
  };

  // Initialize the database
  React.useEffect(() => {
    initDB();
  }, []);

  const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Sorry, we need camera roll permissions to make this work!");
  } else {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }
};


  const startRecording = async () => {
  if (recording) {
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioURI(uri);
  } else {
    const { status } = await Audio.requestPermissionsAsync();
    if (status === "granted") {
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
    } else {
      Alert.alert("Permission not granted", "Cannot record audio");
    }
  }
};


  const playAudio = async () => {
    if (audioURI) {
      const soundObject = new Audio.Sound();
      try {
        await soundObject.loadAsync({ uri: audioURI });
        await soundObject.playAsync();
        setIsPlaying(true);
        soundObject.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
  };

  const saveData = async () => {
    if (image && audioURI && caption) {
      const imageName = `image-${Date.now()}.jpg`;
      const audioName = `audio-${Date.now()}.m4a`;

      const imageCopyURI = FileSystem.documentDirectory + imageName;
      const audioCopyURI = FileSystem.documentDirectory + audioName;

      await FileSystem.copyAsync({
               from: image,
        to: imageCopyURI,
      });

      await FileSystem.copyAsync({
        from: audioURI,
        to: audioCopyURI,
      });

      db.transaction((tx) => {
        tx.executeSql(
          "INSERT INTO items (imageURI, audioURI, caption) VALUES (?, ?, ?)",
          [imageCopyURI, audioCopyURI, caption],
          (_, { rowsAffected }) => {
            if (rowsAffected > 0) {
              Alert.alert("Success", "Data saved successfully!");
            } else {
              Alert.alert("Failed", "Failed to save data.");
            }
          },
          (_, error) => console.log(error)
        );
      });
    } else {
      Alert.alert("Error", "Please provide all required data.");
    }
  };

  const showDBContents = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM items",
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            let data = "";
            for (let i = 0; i < rows.length; i++) {
              data +=
                `ID: ${rows.item(i).id}\n` +
                `Image: ${rows.item(i).imageURI}\n` +
                `Audio: ${rows.item(i).audioURI}\n` +
                `Caption: ${rows.item(i).caption}\n\n`;
            }
            Alert.alert("Database Contents", data);
          } else {
            Alert.alert("Database Contents", "No data found.");
          }
        },
        (_, error) => console.log(error)
      );
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FINAL EXAM - y_shah142873</Text>
      <TouchableOpacity onPress={pickImage} style={styles.pictureArea}>
        {image && <Image source={{ uri: image }} style={styles.image} />}
      </TouchableOpacity>
      <TextInput
        style={styles.captionInput}
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption"
      />
      <TouchableOpacity onPress={startRecording} style={styles.button}>
        <Text style={{color: "#ccc"}}>{recording ? "Stop Recording" : "Record Audio Caption"}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={playAudio}
        style={styles.button}
        disabled={isPlaying}
      >
        <Text style={{color: "#ccc"}}>Play Audio Caption</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={saveData} style={styles.button}>
        <Text style={{color: "#ccc"}}>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={showDBContents} style={styles.button}>
        <Text style={{color: "#ccc"}}>Show DB Contents</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  pictureArea: {
    width: 200,
    height: 200,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  captionInput: {
    width: "80%",
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "blue",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: "center",
  },
});

