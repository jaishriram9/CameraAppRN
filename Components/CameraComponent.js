// components/CameraComponent.js
import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
  Button,
  Pressable,
  Modal,
  ScrollView,
  FlatList,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as ImagePicker from "expo-image-picker";
import { AntDesign } from "@expo/vector-icons";

const CameraComponent = () => {
  const [hasPermission, setHasPermission] = useState();
  const [mediaPermissions, setMediaPermissions] = useState();
  let cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [pdfUri, setPdfUri] = useState(null);

  const [selectedImages, setSelectedImages] = useState(null);
  const [loader, setLaoder] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const media = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === "granted");
      setMediaPermissions(media.status == "granted");
    })();
  }, []);

  const handleSavePDF = async () => {
    setLaoder(true);
    const pdfImages = capturedImages.map((image) => ({ uri: image.uri }));

    // Convert images to a single PDF
    const pdfUriNew = await convertToPDF(pdfImages);

    // Save the PDF URI in state
    setPdfUri(pdfUriNew.uri);

    // Saving PDF to storage
    if (pdfUriNew.uri) {
      let savePhoto = (pdfUriNew) => {
        MediaLibrary.saveToLibraryAsync(pdfUriNew.uri)
          .then((rs) => {
            setLaoder(false);
            Alert.alert("pdf saved successfully to documents folder");
          })
          .catch((err) => {
            setLaoder(false);
            Alert.alert("something went wrong while saving PDF");
            console.log("eerrrr while saving pdf", err);
          });
      };
      savePhoto(pdfUriNew);
    }
  };

  const convertToPDF = async (images) => {
    const base64Images = await Promise.all(
      images.map(async (image) => {
        const base64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${base64}`;
      })
    );

    const htmlContent = base64Images
      .map((image) => `<img src="${image}" width="100%" height="60%" />`)
      .join("");

    let html = `<html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
    </head>
    <body>${htmlContent}
    </body>
    </html>`;

    const pdf = await Print.printToFileAsync({ html: html });

    const destinationUri = `${FileSystem.documentDirectory}CapturedImages.pdf`;

    // Move the PDF file to a location accessible by the Expo app
    await FileSystem.moveAsync({
      from: pdf.uri,
      to: destinationUri,
    });

    return { uri: destinationUri };
  };

  const launchCameraGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        allowsEditing: true,
        base64: true,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
      console.log("Image picker error:", error);
    }
  };

  const takePicture = async () => {
    const newPhoto = await cameraRef.current.takePictureAsync({
      quality: 0.5,
      base64: true,
    });

    setPhoto(newPhoto);
    setCapturedImages([...capturedImages, newPhoto]);
  };

  const deleteImages = (image) => {
    const temp = capturedImages.filter((item) => item != image);
    setCapturedImages(temp);
  };

  if (photo) {
    let savePhoto = () => {
      MediaLibrary.saveToLibraryAsync(photo.uri)
        .then(() => {
          setPhoto(null);
        })
        .catch((err) => console.log("error in saving image", err));
    };

    return (
      <>
        <SafeAreaView style={styles.container}>
          <Image
            style={styles.preview}
            source={{
              uri: "data:image/jpg;base64," + photo.base64,
            }}
          />
        </SafeAreaView>

        <View
          style={{
            marginTop: 10,
            flexDirection: "row",
            justifyContent: "space-around",
            width: "100%",
          }}
        >
          {mediaPermissions ? (
            <TouchableOpacity
              onPress={savePhoto}
              style={[styles.galleryButton, { width: "30%" }]}
            >
              <Text style={styles.galleryButtonText}>Save</Text>
            </TouchableOpacity>
          ) : undefined}

          <TouchableOpacity
            style={[styles.galleryButton, { width: "30%" }]}
            onPress={() => setPhoto(null)}
          >
            <Text style={styles.galleryButtonText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1, width: "100%" }}>
      <Camera
        style={{ height: "72%", borderWidth: 2, borderColor: "red" }}
        type={Camera.Constants.Type.back}
        ref={cameraRef}
      >
        <View
          style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}
        >
          <TouchableOpacity onPress={takePicture} style={{ marginBottom: 20 }}>
            <View
              style={{
                height: 60,
                width: 60,
                backgroundColor: "white",
                borderRadius: 50,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  height: 50,
                  width: 50,
                  backgroundColor: "black",
                  borderRadius: 50,
                }}
              ></View>
            </View>
          </TouchableOpacity>
        </View>
      </Camera>

      <FlatList
        data={capturedImages}
        horizontal={true}
        ListEmptyComponent={
          capturedImages.length == 0 && (
            <Text
              style={{
                color: "blue",
                fontSize: 20,
                fontWeight: "bold",
                textAlign: "center",
                paddingHorizontal: 10,
              }}
            >
              No Captured Images! Click to Capture
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", margin: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={() => deleteImages(item)}
              style={{
                backgroundColor: "transparent",
                width: 40,
                height: 60,
                position: "absolute",
                top: -18,
                left: 70,
                zIndex: 9,
              }}
            >
              <AntDesign
                name="closecircleo"
                size={20}
                color="black"
                style={{ position: "absolute", top: 0, left: 12 }}
              />
            </TouchableOpacity>

            <Image
              style={{ height: 90, width: 90, borderRadius: 7 }}
              source={{ uri: "data:image/jpg;base64," + item.base64 }}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      <View
        style={{
          paddingHorizontal: 10,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        {capturedImages.length > 0 && (
          <TouchableOpacity
            onPress={handleSavePDF}
            style={styles.galleryButton}
          >
            {!loader ? (
              <Text style={styles.galleryButtonText}>Generate PDF</Text>
            ) : (
              <ActivityIndicator size={15} color="white" />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => launchCameraGallery()}
          style={styles.galleryButton}
        >
          <Text style={styles.galleryButtonText}>Crop Images</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 0.8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonContainer: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },
  galleryButtonText: { fontSize: 20, marginBottom: 13, color: "white" },
  preview: {
    alignSelf: "stretch",
    objectFit: "contain",
    flex: 1,
  },
  galleryButton: {
    marginBottom: 20,
    backgroundColor: "blue",
    width: "45%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    borderRadius: 15,
    elevation: 10,
  },

  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },

  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default CameraComponent;
