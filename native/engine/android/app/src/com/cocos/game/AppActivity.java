/****************************************************************************
Copyright (c) 2015-2016 Chukong Technologies Inc.
Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/
package com.cocos.game;

import android.Manifest;
import android.os.Bundle;
import android.os.Build;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.provider.MediaStore;
import android.util.Base64;
import android.content.res.Configuration;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;

import com.cocos.service.SDKWrapper;
import com.cocos.lib.CocosActivity;

import org.json.JSONObject;

public class AppActivity extends CocosActivity {
    private static final int REQUEST_HOMEWORK_IMAGE_PICKER = 7301;
    private static final int REQUEST_MICROPHONE_PERMISSION = 7302;
    private static final int REQUEST_PHOTO_LIBRARY_PERMISSION = 7303;
    private static final int HOMEWORK_IMAGE_COMPRESS_ABOVE_BYTES = 2 * 1024 * 1024;
    private static final int HOMEWORK_IMAGE_MAX_EDGE = 1600;
    private static final int HOMEWORK_IMAGE_JPEG_QUALITY = 82;
    private static AppActivity currentActivity;
    private static volatile String homeworkImagePickerResult = "";
    private static volatile String microphonePermissionResult = "{\"status\":\"unknown\"}";
    private static volatile String photoLibraryPermissionResult = "{\"status\":\"unknown\"}";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentActivity = this;
        // DO OTHER INITIALIZATION BELOW
        SDKWrapper.shared().init(this);

    }

    public static boolean copyTextToClipboard(String text) {
        if (currentActivity == null) {
            return false;
        }

        AtomicBoolean copied = new AtomicBoolean(false);
        CountDownLatch latch = new CountDownLatch(1);
        currentActivity.runOnUiThread(() -> {
            try {
                ClipboardManager clipboard = (ClipboardManager) currentActivity.getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null) {
                    clipboard.setPrimaryClip(ClipData.newPlainText("Buddy Log", text));
                    Toast.makeText(currentActivity, "Log copied", Toast.LENGTH_SHORT).show();
                    copied.set(true);
                }
            } finally {
                latch.countDown();
            }
        });

        try {
            latch.await();
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
        return copied.get();
    }

    public static void copyLogToClipboard(String text) {
        copyTextToClipboard(text);
    }

    public static boolean startHomeworkImagePicker() {
        if (currentActivity == null) {
            return false;
        }

        homeworkImagePickerResult = "{\"status\":\"pending\"}";
        currentActivity.runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
                intent.setType("image/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                currentActivity.startActivityForResult(intent, REQUEST_HOMEWORK_IMAGE_PICKER);
            } catch (Exception pickError) {
                try {
                    Intent fallback = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    fallback.addCategory(Intent.CATEGORY_OPENABLE);
                    fallback.setType("image/*");
                    fallback.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    currentActivity.startActivityForResult(fallback, REQUEST_HOMEWORK_IMAGE_PICKER);
                } catch (Exception openDocumentError) {
                    try {
                        Intent contentFallback = new Intent(Intent.ACTION_GET_CONTENT);
                        contentFallback.addCategory(Intent.CATEGORY_OPENABLE);
                        contentFallback.setType("image/*");
                        contentFallback.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        currentActivity.startActivityForResult(
                            Intent.createChooser(contentFallback, "Select homework image"),
                            REQUEST_HOMEWORK_IMAGE_PICKER
                        );
                    } catch (Exception contentError) {
                        homeworkImagePickerResult = buildHomeworkImagePickerError("相册无法打开");
                    }
                }
            }
        });
        return true;
    }

    public static String getHomeworkImagePickerResult() {
        return homeworkImagePickerResult == null ? "" : homeworkImagePickerResult;
    }

    public static String getNativePermissionStatus(String permissionName) {
        if (currentActivity == null) {
            return buildNativePermissionResult("unavailable", "原生环境不可用");
        }
        if ("microphone".equals(permissionName)) {
            return currentActivity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                ? buildNativePermissionResult("granted", "")
                : buildNativePermissionResult("denied", "麦克风权限未授权");
        }
        if ("photoLibrary".equals(permissionName)) {
            String permission = getPhotoLibraryPermissionName();
            return currentActivity.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED
                ? buildNativePermissionResult("granted", "")
                : buildNativePermissionResult("denied", "相册权限未授权");
        }
        return buildNativePermissionResult("unknown", "未知权限");
    }

    public static String requestNativePermission(String permissionName) {
        if (currentActivity == null) {
            return buildNativePermissionResult("unavailable", "原生环境不可用");
        }
        if ("microphone".equals(permissionName)) {
            if (currentActivity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                microphonePermissionResult = buildNativePermissionResult("granted", "");
                return microphonePermissionResult;
            }
            microphonePermissionResult = buildNativePermissionResult("unknown", "等待麦克风授权");
            currentActivity.runOnUiThread(() ->
                currentActivity.requestPermissions(
                    new String[] { Manifest.permission.RECORD_AUDIO },
                    REQUEST_MICROPHONE_PERMISSION
                )
            );
            return microphonePermissionResult;
        }
        if ("photoLibrary".equals(permissionName)) {
            String permission = getPhotoLibraryPermissionName();
            if (currentActivity.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
                photoLibraryPermissionResult = buildNativePermissionResult("granted", "");
                return photoLibraryPermissionResult;
            }
            photoLibraryPermissionResult = buildNativePermissionResult("unknown", "等待相册授权");
            currentActivity.runOnUiThread(() ->
                currentActivity.requestPermissions(
                    new String[] { permission },
                    REQUEST_PHOTO_LIBRARY_PERMISSION
                )
            );
            return photoLibraryPermissionResult;
        }
        return buildNativePermissionResult("unknown", "未知权限");
    }

    public static String getNativePermissionRequestResult(String permissionName) {
        if ("microphone".equals(permissionName)) {
            return microphonePermissionResult == null ? buildNativePermissionResult("unknown", "等待麦克风授权") : microphonePermissionResult;
        }
        if ("photoLibrary".equals(permissionName)) {
            return photoLibraryPermissionResult == null ? buildNativePermissionResult("unknown", "等待相册授权") : photoLibraryPermissionResult;
        }
        return buildNativePermissionResult("unknown", "未知权限");
    }

    @Override
    protected void onResume() {
        super.onResume();
        SDKWrapper.shared().onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        SDKWrapper.shared().onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Workaround in https://stackoverflow.com/questions/16283079/re-launch-of-activity-on-home-button-but-only-the-first-time/16447508
        if (!isTaskRoot()) {
            return;
        }
        SDKWrapper.shared().onDestroy();
        if (currentActivity == this) {
            currentActivity = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        SDKWrapper.shared().onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_HOMEWORK_IMAGE_PICKER) {
            handleHomeworkImagePickerResult(resultCode, data);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_MICROPHONE_PERMISSION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            microphonePermissionResult = granted
                ? buildNativePermissionResult("granted", "")
                : buildNativePermissionResult("denied", "麦克风权限被拒绝");
        } else if (requestCode == REQUEST_PHOTO_LIBRARY_PERMISSION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            photoLibraryPermissionResult = granted
                ? buildNativePermissionResult("granted", "")
                : buildNativePermissionResult("denied", "相册权限被拒绝");
        }
    }

    private static String getPhotoLibraryPermissionName() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return Manifest.permission.READ_MEDIA_IMAGES;
        }
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private void handleHomeworkImagePickerResult(int resultCode, Intent data) {
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            homeworkImagePickerResult = "{\"status\":\"cancelled\"}";
            return;
        }

        Uri uri = data.getData();
        try {
            getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
        }

        try (InputStream inputStream = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            if (inputStream == null) {
                homeworkImagePickerResult = buildHomeworkImagePickerError("图片无法读取");
                return;
            }

            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }

            byte[] imageBytes = outputStream.toByteArray();
            String mimeType = getContentResolver().getType(uri);
            if (mimeType == null || mimeType.trim().isEmpty()) {
                mimeType = "image/jpeg";
            }
            byte[] uploadBytes = compressHomeworkImageIfUseful(imageBytes);
            if (uploadBytes != imageBytes) {
                mimeType = "image/jpeg";
            }

            JSONObject payload = new JSONObject();
            payload.put("status", "success");
            payload.put("fileName", uploadBytes == imageBytes ? resolveDisplayName(uri) : toJpegFileName(resolveDisplayName(uri)));
            payload.put("mimeType", mimeType);
            payload.put("compressionApplied", uploadBytes != imageBytes);
            payload.put("originalSize", imageBytes.length);
            payload.put("compressedSize", uploadBytes.length);
            payload.put("base64", Base64.encodeToString(uploadBytes, Base64.NO_WRAP));
            homeworkImagePickerResult = payload.toString();
        } catch (Exception error) {
            homeworkImagePickerResult = buildHomeworkImagePickerError("图片读取失败");
        }
    }

    private byte[] compressHomeworkImageIfUseful(byte[] originalBytes) {
        if (originalBytes == null || originalBytes.length < HOMEWORK_IMAGE_COMPRESS_ABOVE_BYTES) {
            return originalBytes;
        }

        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(originalBytes, 0, originalBytes.length, bounds);
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
                return originalBytes;
            }

            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = calculateHomeworkImageSampleSize(bounds.outWidth, bounds.outHeight);
            Bitmap bitmap = BitmapFactory.decodeByteArray(originalBytes, 0, originalBytes.length, options);
            if (bitmap == null) {
                return originalBytes;
            }

            Bitmap scaled = scaleHomeworkImageIfNeeded(bitmap);
            ByteArrayOutputStream compressedOutput = new ByteArrayOutputStream();
            scaled.compress(Bitmap.CompressFormat.JPEG, HOMEWORK_IMAGE_JPEG_QUALITY, compressedOutput);
            byte[] compressedBytes = compressedOutput.toByteArray();

            if (scaled != bitmap) {
                scaled.recycle();
            }
            bitmap.recycle();

            return compressedBytes.length > 0 && compressedBytes.length < originalBytes.length
                ? compressedBytes
                : originalBytes;
        } catch (Exception ignored) {
            return originalBytes;
        }
    }

    private static int calculateHomeworkImageSampleSize(int width, int height) {
        int sampleSize = 1;
        while (Math.max(width / sampleSize, height / sampleSize) > HOMEWORK_IMAGE_MAX_EDGE * 2) {
            sampleSize *= 2;
        }
        return sampleSize;
    }

    private static Bitmap scaleHomeworkImageIfNeeded(Bitmap bitmap) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int longestEdge = Math.max(width, height);
        if (longestEdge <= HOMEWORK_IMAGE_MAX_EDGE) {
            return bitmap;
        }
        float scale = (float) HOMEWORK_IMAGE_MAX_EDGE / (float) longestEdge;
        int targetWidth = Math.max(1, Math.round(width * scale));
        int targetHeight = Math.max(1, Math.round(height * scale));
        return Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
    }

    private static String toJpegFileName(String fileName) {
        String safeName = fileName == null || fileName.trim().isEmpty() ? "homework-image" : fileName.trim();
        return safeName.replaceFirst("(?i)\\.(png|jpe?g|webp|heic|heif)$", "") + ".jpg";
    }

    private String resolveDisplayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameIndex >= 0) {
                    String displayName = cursor.getString(nameIndex);
                    if (displayName != null && !displayName.trim().isEmpty()) {
                        return displayName;
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return "homework-image.jpg";
    }

    private static String buildHomeworkImagePickerError(String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("status", "error");
            payload.put("message", message);
            return payload.toString();
        } catch (Exception ignored) {
            return "{\"status\":\"error\",\"message\":\"图片选择失败\"}";
        }
    }

    private static String buildNativePermissionResult(String status, String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("status", status);
            payload.put("message", message);
            return payload.toString();
        } catch (Exception ignored) {
            return "{\"status\":\"error\",\"message\":\"权限结果异常\"}";
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        SDKWrapper.shared().onNewIntent(intent);
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        SDKWrapper.shared().onRestart();
    }

    @Override
    protected void onStop() {
        super.onStop();
        SDKWrapper.shared().onStop();
    }

    @Override
    public void onBackPressed() {
        SDKWrapper.shared().onBackPressed();
        super.onBackPressed();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        SDKWrapper.shared().onConfigurationChanged(newConfig);
        super.onConfigurationChanged(newConfig);
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        SDKWrapper.shared().onRestoreInstanceState(savedInstanceState);
        super.onRestoreInstanceState(savedInstanceState);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        SDKWrapper.shared().onSaveInstanceState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onStart() {
        SDKWrapper.shared().onStart();
        super.onStart();
    }

    @Override
    public void onLowMemory() {
        SDKWrapper.shared().onLowMemory();
        super.onLowMemory();
    }
}
