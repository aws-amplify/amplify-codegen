package com.example.android;

import android.app.Application;
import android.util.Log;

import com.amplifyframework.AmplifyException;
import com.amplifyframework.core.Amplify;

public class MyAndroidApp extends Application {
  public void onCreate() {
    super.onCreate();

    try {
      Amplify.configure(getApplicationContext());
      Log.i("MyAmplifyApp", "Initialized Amplify");
    } catch (AmplifyException error) {
      Log.e("MyAmplifyApp", "Could not initialize Amplify", error);
    }
  }
}
