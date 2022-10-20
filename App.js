import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Camera, CameraType } from "expo-camera";
import DeviceInfo from "react-native-device-info";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import axios from "axios";

export default function App() {
  //  camera permissions
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [inter, setInter] = useState(null);
  const [exeEvent, setExeEvent] = useState(null);
  const [zoom, setZoom] = useState(0);
  const [receiveDuration, setReceiveDuration] = useState(1);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [cameraReady, setCameraReady] = useState(false);
  const [verified, setVerified] = useState(false);
  const [number, setNumber] = useState(60);

  // Screen Ratio and image padding
  const [imagePadding, setImagePadding] = useState(0);
  const [ratio, setRatio] = useState("4:3");
  const { height, width } = Dimensions.get("window");
  const screenRatio = height / width;
  const [isRatioSet, setIsRatioSet] = useState(false);
  const [cameraAuthority, setCameraAuthority] = useState(false);
  const [micAuthority, setMicAuthority] = useState(false);

  const Mycamera = useRef();
  const deviceUniqueId = DeviceInfo.getUniqueIdSync();
  console.log("deviceUniqueId:", deviceUniqueId);

  useEffect(() => {
    Camera.requestMicrophonePermissionsAsync();
  }, [micAuthority]);

  useEffect(() => {
    async function getCameraStatus() {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status == "granted");
    }
    getCameraStatus();
  }, []);

  const prepareRatio = async () => {
    let desiredRatio = "4:3";
    if (Platform.OS === "android") {
      const ratios = await camera.getSupportedRatiosAsync();

      let distances = {};
      let realRatios = {};
      let minDistance = null;
      for (const ratio of ratios) {
        const parts = ratio.split(":");
        const realRatio = parseInt(parts[0]) / parseInt(parts[1]);
        realRatios[ratio] = realRatio;
        const distance = screenRatio - realRatio;
        distances[ratio] = realRatio;
        if (minDistance == null) {
          minDistance = ratio;
        } else {
          if (distance >= 0 && distance < distances[minDistance]) {
            minDistance = ratio;
          }
        }
      }
      desiredRatio = minDistance;
      const remainder = Math.floor(
        (height - realRatios[desiredRatio] * width) / 2
      );
      setImagePadding(remainder);
      setRatio(desiredRatio);
      setIsRatioSet(true);
    }
  };

  const onCameraReady = async () => {
    if (!isRatioSet) {
      await prepareRatio();
    }
    setCameraReady(true);
  };
  //==========================================

  const cameraExecuter = async () => {
    const video = await Mycamera.current.recordAsync({
      maxDuration: receiveDuration,
      quality: Camera.Constants.VideoQuality["1080p"],
      mute: true,
    });
    console.log("video:", video);
    let formData = new FormData();
    formData.append("file", {
      name: "myVideo.mp4",
      uri: video?.uri,
      type: "video/mp4",
    });
    formData.append("deviceUniqueId", deviceUniqueId);
    formData.append("zoom", Math.round(zoom * 100));
    axios
      .post(
        "http://112.175.114.29:4002/jjnet/uploadVideoExeExtract",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )
      .then((res) => {
        if (res?.data?.ok) {
          if (res?.data?.data?.zoom !== zoom) {
            setZoom(res?.data?.data?.zoom * 0.01);
          }
          if (res?.data?.data?.duration !== receiveDuration) {
            setReceiveDuration(res?.data?.data?.duration);
          }
        } else {
          setZoom(0);
          setReceiveDuration(1);
        }
        return;
      })
      .catch((err) => console.log(err));
  };
  const takeVideo = async () => {
    await cameraExecuter();
    const ii = setInterval(() => {
      setExeEvent(new Date());
    }, Number(number) * 1000);
    setInter(ii);
  };

  const RecordingFunc = () => {
    if (isRecording === false) {
      setIsRecording(true);
      takeVideo();
      activateKeepAwake();
    } else {
      setIsRecording(false);
      clearInterval(inter);
      setExeEvent(null);
      deactivateKeepAwake();
    }
  };
  return (
    <>
      {verified === false ? (
        <View>
          {(setCameraAuthority(true), setMicAuthority(true))}
          {cameraAuthority === true && micAuthority === true
            ? setVerified(true)
            : null}
        </View>
      ) : (
        <View style={styles.container}>
          <Camera
            style={[
              styles.cameraPreview,
              { marginTop: imagePadding, marginBottom: imagePadding },
            ]}
            onCameraReady={onCameraReady}
            ratio={ratio}
            ref={(ref) => {
              setCamera(ref);
            }}
            type={cameraType}
            zoom={zoom}
          ></Camera>
          {isRecording ? (
            <TouchableOpacity
              onPress={() => {
                RecordingFunc();
              }}
              style={styles.recordingButton}
            >
              <ActivityIndicator size="large" color="#ff0000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                RecordingFunc();
              }}
              style={styles.recordingButton}
            />
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  information: {
    flex: 1,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  cameraPreview: {
    flex: 1,
  },
  recordingButton: {
    width: 70,
    height: 70,
    borderWidth: 8,
    borderRadius: 50,
    borderColor: "#ffffff",
    position: "absolute",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
  },
});
