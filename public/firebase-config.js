// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDKSMy4Vrk6BDHPu205pxSygwC01tGnNOM",
    authDomain: "shymonkiy.firebaseapp.com",
    projectId: "shymonkiy",
    storageBucket: "shymonkiy.firebasestorage.app",
    messagingSenderId: "832041739228",
    appId: "1:832041739228:web:a74ad3e1543949f0416519",
    measurementId: "G-7HRNCEHKNT"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
