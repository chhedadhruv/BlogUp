import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import React, {useState, useContext, useEffect} from 'react';
import {FloatingAction} from 'react-native-floating-action';
import IonIcons from 'react-native-vector-icons/Ionicons';
import {
  InputField,
  InputWrapper,
  AddImage,
  SubmitBtn,
  SubmitBtnText,
  StatusWrapper,
} from '../styles/AddPost';
import ImageCropPicker from 'react-native-image-crop-picker';
import {AuthContext} from '../navigation/AuthProvider';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';

const actions = [
  {
    text: 'Take Photo',
    icon: <IonIcons name="camera-outline" size={25} />,
    name: 'take_photo',
    position: 1,
    onclick: () => takePhotoFromCamera(),
  },
  {
    text: 'Choose Photo',
    icon: <IonIcons name="image-outline" size={25} />,
    name: 'choose_photo',
    position: 2,
    onclick: () => choosePhotoFromLibrary(),
  },
];

const AddPostScreen = ({navigation}) => {
  const permission = () => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  };
  const {user} = useContext(AuthContext);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [transferred, setTransferred] = useState(0);
  const [post, setPost] = useState(null);

  const takePhotoFromCamera = () => {
    ImageCropPicker.openCamera({
      width: 1200,
      height: 780,
      cropping: true,
    }).then(image => {
      console.log(image);
      const imageUri = Platform.OS === 'ios' ? image.sourceURL : image.path;
      setImage(imageUri);
    });
  };

  const choosePhotoFromLibrary = () => {
    ImageCropPicker.openPicker({
      width: 1200,
      height: 780,
      cropping: true,
    }).then(image => {
      console.log(image);
      const imageUri = Platform.OS === 'ios' ? image.sourceURL : image.path;
      setImage(imageUri);
    });
  };
  const submitPost = async () => {
    const imageUrl = await uploadImage();
    console.log('Image Url: ', imageUrl);
    firestore()
      .collection('posts')
      .add({
        userId: user.uid,
        post: post,
        postImg: imageUrl,
        postTime: firestore.Timestamp.fromDate(new Date()),
      })
      .then(() => {
        console.log('Post Added!');
        Alert.alert(
          'Post published!',
          'Your post has been published Successfully!',
        );
        navigation.goBack();
        setPost(null);
      })
      .catch(error => {
        console.log(
          'Something went wrong with added post to firestore.',
          error,
        );
      });
  };
  const uploadImage = async () => {
    if (image == null) {
      return null;
    }
    const uploadUri = image;
    let filename = uploadUri.substring(uploadUri.lastIndexOf('/') + 1);
    // Add timestamp to File Name
    const extension = filename.split('.').pop();
    const name = filename.split('.').slice(0, -1).join('.');
    filename = name + Date.now() + '.' + extension;
    setUploading(true);
    setTransferred(0);
    const storageRef = storage().ref(`photos/${filename}`);
    const task = storageRef.putFile(uploadUri);
    // Set transferred state
    task.on('state_changed', taskSnapshot => {
      console.log(
        `${taskSnapshot.bytesTransferred} transferred out of ${taskSnapshot.totalBytes}`,
      );
      setTransferred(
        Math.round(taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) *
          10000,
      );
    });
    try {
      await task;
      const url = await storageRef.getDownloadURL();
      setUploading(false);
      Alert.alert(
        'Image uploaded!',
        'Your image has been uploaded to Firebase Cloud Storage!',
      );
      return url;
    } catch (e) {
      console.log(e);
    }
    setImage(null);
  };

  useEffect(() => {
    permission();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <InputWrapper>
        {image !== null ? <AddImage source={{uri: image}} /> : null}
        <InputField
          placeholder="What's on your mind?"
          multiline={true}
          numberOfLines={4}
          value={post}
          onChangeText={content => setPost(content)}
        />
        {uploading ? (
          <StatusWrapper>
            <Text>{transferred} % Completed!</Text>
            <ActivityIndicator size="large" color="#0000ff" />
          </StatusWrapper>
        ) : (
          <SubmitBtn onPress={() => submitPost()}>
            <SubmitBtnText>Post</SubmitBtnText>
          </SubmitBtn>
        )}
      </InputWrapper>
      <FloatingAction
        actions={actions}
        onPressItem={name => {
          if (name === 'take_photo') {
            takePhotoFromCamera();
          } else if (name === 'choose_photo') {
            choosePhotoFromLibrary();
          }
        }}
      />
    </View>
  );
};

export default AddPostScreen;
