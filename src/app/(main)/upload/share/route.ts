import { NextRequest, NextResponse } from 'next/server';

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

    // Convert file to base64 for passing to client
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
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

