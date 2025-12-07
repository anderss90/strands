import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

// Maximum file size for base64 conversion (4MB)
// Files larger than this or videos should use direct upload
const MAX_BASE64_SIZE = 4 * 1024 * 1024; // 4MB

// This route handler receives the POST request from Web Share Target API
// The browser sends multipart/form-data with the shared image file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Web Share Target API: the "name" property in the files array is the form field name
    // In manifest, we have files: [{ name: "image", ... }], so the field is "image"
    const file = formData.get('image') as File | null;

    if (!file) {
      // If no file, redirect to upload page
      return NextResponse.redirect(new URL('/upload', request.url));
    }

    // Validate file type (support both images and videos)
    const isVideo = file.type.startsWith('video/');
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const allowedVideoExtensions = ['mp4', 'mov', 'avi', 'webm'];
    const hasValidImageMimeType = file.type && allowedImageTypes.includes(file.type);
    const hasValidVideoMimeType = file.type && allowedVideoTypes.includes(file.type);
    const hasValidImageExtension = allowedImageExtensions.includes(fileExtension);
    const hasValidVideoExtension = allowedVideoExtensions.includes(fileExtension);
    const isValidImage = hasValidImageMimeType || hasValidImageExtension;
    const isValidVideo = hasValidVideoMimeType || hasValidVideoExtension;

    if (!isValidImage && !isValidVideo) {
      // Invalid file type, redirect to upload page
      return NextResponse.redirect(new URL('/upload?error=invalid_file_type', request.url));
    }

    // Determine MIME type
    let mimeType = file.type;
    if (!mimeType) {
      const extensionToMime: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
      };
      mimeType = extensionToMime[fileExtension] || (isValidVideo ? 'video/mp4' : 'image/jpeg');
    }

    // Check if file is a video or too large for base64 conversion
    // Videos and large files should use direct upload to Supabase Storage
    const shouldUseDirectUpload = isValidVideo || file.size > MAX_BASE64_SIZE;

    if (shouldUseDirectUpload) {
      // For videos or large files, we can't convert to base64 (would cause 413 error)
      // Instead, upload directly to Supabase Storage from the serverless function
      try {
        const supabase = createServerSupabase();
        const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'images';
        
        // Generate unique filename
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || (isValidVideo ? 'mp4' : 'jpg');
        const fileName = `${randomUUID()}.${fileExtension}`;
        const filePath = `shared/${fileName}`; // Store in a "shared" folder
        
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          return NextResponse.redirect(new URL('/upload?error=upload_failed', request.url));
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(filePath);

        const fileUrl = urlData.publicUrl;

        // Return HTML page that stores the file URL in sessionStorage and redirects
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Processing shared ${isValidVideo ? 'video' : 'file'}...</title>
</head>
<body>
  <script>
    try {
      // Store shared file data in sessionStorage (using URL instead of base64)
      const fileData = {
        name: ${JSON.stringify(file.name)},
        type: ${JSON.stringify(mimeType)},
        size: ${file.size},
        url: ${JSON.stringify(fileUrl)},
        path: ${JSON.stringify(filePath)},
        isVideo: ${isValidVideo}
      };
      
      sessionStorage.setItem('sharedFile', JSON.stringify(fileData));
      
      // Redirect to upload page
      window.location.href = '/upload?shared=true&type=${isValidVideo ? 'video' : 'large'}';
    } catch (error) {
      console.error('Error processing shared file:', error);
      window.location.href = '/upload?error=processing_failed';
    }
  </script>
  <p>Processing shared ${isValidVideo ? 'video' : 'file'}...</p>
</body>
</html>
        `;

        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
          },
        });
      } catch (uploadError: any) {
        console.error('Error uploading file to storage:', uploadError);
        return NextResponse.redirect(new URL('/upload?error=upload_failed', request.url));
      }
    }

    // For smaller images, convert to base64 as before
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Return HTML page that stores the file in sessionStorage and redirects
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Processing shared image...</title>
</head>
<body>
  <script>
    try {
      // Store shared image data in sessionStorage
      const imageData = {
        name: ${JSON.stringify(file.name)},
        type: ${JSON.stringify(mimeType)},
        size: ${file.size},
        data: ${JSON.stringify(base64)}
      };
      
      sessionStorage.setItem('sharedImage', JSON.stringify(imageData));
      
      // Redirect to upload page
      window.location.href = '/upload?shared=true';
    } catch (error) {
      console.error('Error processing shared image:', error);
      window.location.href = '/upload?error=processing_failed';
    }
  </script>
  <p>Processing shared image...</p>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Share handler error:', error);
    return NextResponse.redirect(new URL('/upload?error=share_failed', request.url));
  }
}

