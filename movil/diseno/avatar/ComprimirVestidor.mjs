import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [chrome, origen, salida, temporal] = process.argv.slice(2);
if (!chrome || !origen || !salida || !temporal) {
    throw new Error("Indica el navegador, la carpeta PNG, la carpeta WebP y una carpeta temporal.");
}
const archivos = (await readdir(origen)).filter(nombre => nombre.endsWith(".png")).sort();
if (archivos.length === 0) throw new Error("No hay hojas PNG para comprimir.");

await mkdir(salida, { recursive: true });
await mkdir(temporal, { recursive: true });
const raizTemporal = await realpath(temporal);
const sesion = await realpath(await mkdtemp(join(raizTemporal, "webp-")));
if (dirname(sesion) !== raizTemporal) throw new Error("Carpeta temporal inválida.");
try {
    for (let inicio = 0; inicio < archivos.length; inicio += 100) {
        const lote = archivos.slice(inicio, inicio + 100);
        const urls = lote.map(nombre => pathToFileURL(resolve(origen, nombre)).href);
        const pagina = join(sesion, "codificar.html");
        const etiquetas = urls.map(url => `<img src="${url}" hidden>`).join("");
        await writeFile(pagina, `<!doctype html><meta charset="UTF-8"><pre id="resultado"></pre>
${etiquetas}
<script>
const resultado = document.querySelector("#resultado");
addEventListener("load", () => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 896;
    canvas.height = 448;
    const ctx = canvas.getContext("2d", { alpha: true });
    for (const imagen of document.images) {
        if (imagen.naturalWidth !== 896 || imagen.naturalHeight !== 448) throw new Error(imagen.src);
        ctx.clearRect(0, 0, 896, 448);
        ctx.drawImage(imagen, 0, 0);
        const encoded = canvas.toDataURL("image/webp", 0.90);
        if (!encoded.startsWith("data:image/webp;base64,")) throw new Error("WebP no disponible");
        resultado.append(encoded.slice(23), "\\n");
    }
    resultado.append("FIN");
  } catch (error) {
    resultado.append("ERROR " + error.message);
  }
});
</script>`);
        const dom = await codificar(pagina);
        const resultado = dom.match(/<pre id="resultado">([\s\S]*?)<\/pre>/)?.[1].trim() ?? "";
        const lineas = resultado.split("\n");
        if (lineas.pop() !== "FIN" || lineas.length !== lote.length) {
            throw new Error("El navegador no devolvió todo el lote. " + (resultado.slice(-150) || "Resultado vacío."));
        }
        await Promise.all(lote.map((nombre, i) => {
            const imagen = Buffer.from(lineas[i], "base64");
            if (imagen.toString("ascii", 8, 12) !== "WEBP") throw new Error("WebP inválido " + nombre);
            return writeFile(join(salida, basename(nombre, ".png") + ".webp"), imagen);
        }));
        console.log(`${inicio + lote.length}/${archivos.length} hojas`);
    }
} finally {
    await rm(sesion, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

function codificar(pagina) {
    return new Promise((aceptar, rechazar) => {
        const navegador = spawn(chrome, [
            "--headless", "--disable-gpu", "--disable-background-networking", "--disable-crashpad-for-testing",
            "--no-first-run", "--no-default-browser-check", "--allow-file-access-from-files",
            "--user-data-dir=" + join(sesion, "perfil"), "--dump-dom", "--virtual-time-budget=120000",
            pathToFileURL(pagina).href,
        ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        const partes = [];
        const errores = [];
        navegador.stdout.on("data", parte => partes.push(parte));
        navegador.stderr.on("data", parte => errores.push(parte));
        navegador.on("error", rechazar);
        navegador.on("close", codigo => {
            if (codigo === 0) aceptar(Buffer.concat(partes).toString("utf8"));
            else rechazar(new Error(Buffer.concat(errores).toString("utf8")));
        });
    });
}
