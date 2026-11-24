package pe.kusi.movil

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import app.rive.ImageAsset
import app.rive.Result
import app.rive.Rive
import app.rive.RiveFileSource
import app.rive.RivePointerInputMode
import app.rive.RiveSemanticsMode
import app.rive.ViewModelInstance
import app.rive.ViewModelSource
import app.rive.rememberArtboardResult
import app.rive.rememberRiveFile
import app.rive.rememberRiveWorkerOrNull
import app.rive.rememberStateMachineResult
import app.rive.rememberViewModelInstanceResult
import app.rive.runtime.kotlin.core.Rive as MotorRive
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
internal fun EscenaRiveLocal(
    recurso: String,
    tablero: String,
    maquinaYModelo: String,
    modifier: Modifier,
    atlas: String? = null,
    sincronizar: @Composable (ViewModelInstance) -> Unit,
): Boolean {
    val contexto = LocalContext.current
    val id = remember(contexto, recurso) { contexto.resources.getIdentifier(recurso, "raw", contexto.packageName) }
    if (id == 0) return false
    val inicializado = remember(contexto) {
        try {
            MotorRive.init(contexto.applicationContext)
            true
        } catch (_: Exception) {
            false
        } catch (_: LinkageError) {
            false
        }
    }
    if (!inicializado) return false
    val trabajador = rememberRiveWorkerOrNull() ?: return false
    val archivo = (rememberRiveFile(RiveFileSource.RawRes.from(id), trabajador) as? Result.Success)?.value ?: return false
    val arte = (rememberArtboardResult(archivo, tablero) as? Result.Success)?.value ?: return false
    val maquina = (rememberStateMachineResult(arte, maquinaYModelo) as? Result.Success)?.value ?: return false
    val modelo = (rememberViewModelInstanceResult(archivo, ViewModelSource.Named(maquinaYModelo).defaultInstance())
        as? Result.Success)?.value ?: return false
    if (atlas != null) {
        val atlasListo by produceState<String?>(null, modelo, atlas) {
            val bytes = withContext(Dispatchers.IO) { contexto.assets.open(atlas).use { it.readBytes() } }
            val imagen = (ImageAsset.fromBytes(trabajador, bytes) as? Result.Success)?.value ?: return@produceState
            try {
                modelo.setImage("ilustracion", imagen)
                value = atlas
                awaitDispose {}
            } finally {
                imagen.close()
            }
        }
        if (atlasListo != atlas) return false
    }
    sincronizar(modelo)
    Rive(archivo, modifier, artboard = arte, stateMachine = maquina, viewModelInstance = modelo,
        pointerInputMode = RivePointerInputMode.PassThrough, semantics = RiveSemanticsMode.Off)
    return true
}
