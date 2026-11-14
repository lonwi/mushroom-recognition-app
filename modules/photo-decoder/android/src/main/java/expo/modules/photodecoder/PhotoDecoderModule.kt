package expo.modules.photodecoder

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.os.Debug
import androidx.annotation.RequiresApi
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.io.InputStream
import java.util.Locale
import kotlin.math.min
import kotlin.math.round
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Geometria jest ta sama co w `src/core/ai/decode-plan.ts`.
 * Przykłady przypięte testem: 4000×3000 → sample 4 i cel 597×448;
 * 900×1600 → sample 2 i cel 448×796; 895×1000 → sample 1 i cel 448×501;
 * 400×300 bez skalowania; 896×896 → sample 2 i cel 448×448.
 */
internal class PhotoDecoderException(code: String, message: String) :
  CodedException(code, message, null)

internal data class PlannedSize(val width: Int, val height: Int, val scaled: Boolean)

internal fun chooseInSampleSize(width: Int, height: Int, minShortSide: Int): Int {
  val shortSide = min(width, height)
  if (shortSide <= minShortSide) return 1
  var sample = 1
  while (shortSide / (sample * 2) >= minShortSide) {
    sample *= 2
  }
  return sample
}

internal fun targetSize(width: Int, height: Int, minShortSide: Int): PlannedSize {
  val shortSide = min(width, height)
  if (shortSide <= minShortSide) return PlannedSize(width, height, false)
  val scale = minShortSide.toDouble() / shortSide.toDouble()
  var targetWidth = round(width * scale).toInt().coerceAtLeast(1)
  var targetHeight = round(height * scale).toInt().coerceAtLeast(1)
  if (min(targetWidth, targetHeight) < minShortSide) {
    if (targetWidth <= targetHeight) targetWidth = minShortSide else targetHeight = minShortSide
  }
  return PlannedSize(targetWidth, targetHeight, true)
}

class DecodedPhotoRecord : Record {
  @Field
  var width: Int = 0

  @Field
  var height: Int = 0

  @Field
  var rgb: ByteArray = ByteArray(0)

  @Field
  var sampleSize: Int = 1

  @Field
  var usedTargetSize: Boolean = false

  @Field
  var sourceWidth: Int = 0

  @Field
  var sourceHeight: Int = 0

  @Field
  var exifOrientation: Int = ExifInterface.ORIENTATION_NORMAL

  @Field
  var peakPssKb: Int = 0

  @Field
  var peakNativeHeapKb: Int = 0

  @Field
  var peakJavaHeapKb: Int = 0
}

class ProcessMemoryRecord : Record {
  @Field
  var pssKb: Int = 0

  @Field
  var nativeHeapKb: Int = 0

  @Field
  var javaHeapKb: Int = 0
}

private data class MemorySample(val pssKb: Int, val nativeHeapKb: Int, val javaHeapKb: Int)

private fun sampleMemory(): MemorySample {
  val runtime = Runtime.getRuntime()
  val javaHeapKb = ((runtime.totalMemory() - runtime.freeMemory()) / 1024L).toInt()
  val nativeHeapKb = (Debug.getNativeHeapAllocatedSize() / 1024L).toInt()
  val info = Debug.MemoryInfo()
  Debug.getMemoryInfo(info)
  return MemorySample(info.totalPss, nativeHeapKb, javaHeapKb)
}

private fun parseUri(raw: String): Uri {
  val trimmed = raw.trim()
  if (trimmed.isEmpty()) {
    throw PhotoDecoderException("unreadable", "Pusty adres zdjęcia.")
  }
  if (trimmed.startsWith("/")) return Uri.fromFile(File(trimmed))
  return Uri.parse(trimmed)
}

private fun openStream(context: Context, uri: Uri): InputStream {
  return when (uri.scheme?.lowercase(Locale.US)) {
    "content" ->
      context.contentResolver.openInputStream(uri)
        ?: throw PhotoDecoderException("unreadable", "Nie udało się otworzyć zdjęcia.")
    "file", null -> {
      val path = uri.path ?: throw PhotoDecoderException("unreadable", "Brak ścieżki pliku.")
      FileInputStream(File(path))
    }
    else -> throw PhotoDecoderException("unreadable", "Nieobsługiwany adres zdjęcia.")
  }
}

private fun readOrientation(context: Context, uri: Uri): Int {
  return try {
    openStream(context, uri).use { stream ->
      ExifInterface(stream).getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL,
      )
    }
  } catch (_: IOException) {
    ExifInterface.ORIENTATION_NORMAL
  }
}

private fun readBounds(context: Context, uri: Uri): Pair<Int, Int> {
  openStream(context, uri).use { stream ->
    val options =
      BitmapFactory.Options().apply {
        inJustDecodeBounds = true
        inScaled = false
      }
    BitmapFactory.decodeStream(stream, null, options)
    if (options.outWidth <= 0 || options.outHeight <= 0) {
      throw PhotoDecoderException("empty", "Dekoder nie odczytał wymiarów zdjęcia.")
    }
    return options.outWidth to options.outHeight
  }
}

private fun decodeSubsampled(context: Context, uri: Uri, sampleSize: Int): Bitmap {
  openStream(context, uri).use { stream ->
    val options =
      BitmapFactory.Options().apply {
        inSampleSize = sampleSize
        inScaled = false
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
    return BitmapFactory.decodeStream(stream, null, options)
      ?: throw PhotoDecoderException("decode_failed", "Nie udało się zdekodować zdjęcia.")
  }
}

@RequiresApi(28)
private fun decodeWithImageDecoder(
  context: Context,
  uri: Uri,
  minShortSide: Int,
): Pair<Bitmap, Boolean> {
  val source =
    when (uri.scheme?.lowercase(Locale.US)) {
      "content" -> ImageDecoder.createSource(context.contentResolver, uri)
      else -> {
        val path = uri.path ?: throw PhotoDecoderException("unreadable", "Brak ścieżki pliku.")
        ImageDecoder.createSource(File(path))
      }
    }
  var usedTarget = false
  val bitmap =
    ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
      decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE)
      decoder.setUnpremultipliedRequired(true)
      val planned = targetSize(info.size.width, info.size.height, minShortSide)
      if (planned.scaled) {
        usedTarget = true
        decoder.setTargetSize(planned.width, planned.height)
      }
    }
  if (bitmap.width <= 0 || bitmap.height <= 0) {
    bitmap.recycle()
    throw PhotoDecoderException("empty", "Dekoder nie odczytał wymiarów zdjęcia.")
  }
  return bitmap to usedTarget
}

private fun applyExif(source: Bitmap, orientation: Int): Bitmap {
  val matrix = Matrix()
  when (orientation) {
    ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
    ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
    ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
    ExifInterface.ORIENTATION_TRANSPOSE -> {
      matrix.postRotate(90f)
      matrix.postScale(-1f, 1f)
    }
    ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
    ExifInterface.ORIENTATION_TRANSVERSE -> {
      matrix.postRotate(270f)
      matrix.postScale(-1f, 1f)
    }
    ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
    else -> return source
  }
  return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, false)
}

private fun packRgb(bitmap: Bitmap): ByteArray {
  val width = bitmap.width
  val height = bitmap.height
  val rgb = ByteArray(width * height * 3)
  val row = IntArray(width)
  var offset = 0
  for (y in 0 until height) {
    bitmap.getPixels(row, 0, width, 0, y, width, 1)
    for (x in 0 until width) {
      val pixel = row[x]
      rgb[offset++] = ((pixel shr 16) and 0xff).toByte()
      rgb[offset++] = ((pixel shr 8) and 0xff).toByte()
      rgb[offset++] = (pixel and 0xff).toByte()
    }
  }
  return rgb
}

private class Peak {
  var pssKb: Int = 0
  var nativeHeapKb: Int = 0
  var javaHeapKb: Int = 0

  fun note() {
    val sample = sampleMemory()
    pssKb = maxOf(pssKb, sample.pssKb)
    nativeHeapKb = maxOf(nativeHeapKb, sample.nativeHeapKb)
    javaHeapKb = maxOf(javaHeapKb, sample.javaHeapKb)
  }
}

private fun decodePhoto(context: Context, rawUri: String, minShortSide: Int): DecodedPhotoRecord {
  try {
    return decodePhotoBody(context, rawUri, minShortSide)
  } catch (error: PhotoDecoderException) {
    throw error
  } catch (_: OutOfMemoryError) {
    throw PhotoDecoderException("oom", "Brak pamięci przy dekodowaniu zdjęcia.")
  } catch (_: IOException) {
    throw PhotoDecoderException("unreadable", "Nie udało się otworzyć zdjęcia.")
  }
}

private fun decodePhotoBody(context: Context, rawUri: String, minShortSide: Int): DecodedPhotoRecord {
  if (minShortSide < 1 || minShortSide > 8192) {
    throw PhotoDecoderException("invalid_argument", "Minimalny krótszy bok musi być od 1 do 8192.")
  }
  val uri = parseUri(rawUri)
  val orientation = readOrientation(context, uri)
  val (sourceWidth, sourceHeight) = readBounds(context, uri)
  val peak = Peak()
  var bitmap: Bitmap? = null
  var oriented: Bitmap? = null
  try {
    val sampleSize: Int
    val usedTarget: Boolean
    if (Build.VERSION.SDK_INT >= 28) {
      try {
        val decoded = decodeWithImageDecoder(context, uri, minShortSide)
        bitmap = decoded.first
        usedTarget = decoded.second
        sampleSize = 1
      } catch (oom: OutOfMemoryError) {
        throw oom
      } catch (error: PhotoDecoderException) {
        throw error
      } catch (_: Throwable) {
        val sample = chooseInSampleSize(sourceWidth, sourceHeight, minShortSide)
        bitmap = decodeSubsampled(context, uri, sample)
        sampleSize = sample
        usedTarget = false
      }
    } else {
      val sample = chooseInSampleSize(sourceWidth, sourceHeight, minShortSide)
      bitmap = decodeSubsampled(context, uri, sample)
      sampleSize = sample
      usedTarget = false
    }
    val decodedBitmap = bitmap ?: throw PhotoDecoderException("decode_failed", "Nie udało się zdekodować zdjęcia.")
    peak.note()
    oriented = applyExif(decodedBitmap, orientation)
    if (oriented !== decodedBitmap) decodedBitmap.recycle()
    peak.note()
    val rgb = packRgb(oriented ?: decodedBitmap)
    peak.note()
    val result = oriented ?: decodedBitmap
    return DecodedPhotoRecord().apply {
      width = result.width
      height = result.height
      this.rgb = rgb
      this.sampleSize = sampleSize
      this.usedTargetSize = usedTarget
      this.sourceWidth = sourceWidth
      this.sourceHeight = sourceHeight
      exifOrientation = orientation
      peakPssKb = peak.pssKb
      peakNativeHeapKb = peak.nativeHeapKb
      peakJavaHeapKb = peak.javaHeapKb
    }
  } catch (error: PhotoDecoderException) {
    throw error
  } finally {
    oriented?.let { if (!it.isRecycled) it.recycle() }
    bitmap?.let { if (!it.isRecycled) it.recycle() }
  }
}

class PhotoDecoderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PhotoDecoder")

    AsyncFunction("decode") Coroutine { uri: String, minShortSide: Int ->
      val context =
        appContext.reactContext
          ?: throw PhotoDecoderException("unreadable", "Brak kontekstu aplikacji.")
      withContext(Dispatchers.IO) { decodePhoto(context, uri, minShortSide) }
    }

    AsyncFunction("readProcessMemory") {
      val sample = sampleMemory()
      ProcessMemoryRecord().apply {
        pssKb = sample.pssKb
        nativeHeapKb = sample.nativeHeapKb
        javaHeapKb = sample.javaHeapKb
      }
    }
  }
}
