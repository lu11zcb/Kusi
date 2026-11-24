import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:webview_flutter/webview_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const Directionality(textDirection: TextDirection.ltr, child: KusiGame()));
}

class KusiGame extends StatefulWidget {
  const KusiGame({super.key});
  @override
  State<KusiGame> createState() => _KusiGameState();
}

class _KusiGameState extends State<KusiGame> {
  HttpServer? _server;
  WebViewController? _controller;
  String? _error;
  final HttpClient _client = HttpClient();
  @override
  void initState() { super.initState(); unawaited(_start()); }

  Future<void> _start() async {
    try {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 5189);
      _server = server;
      server.listen((request) async {
        try {
          if (request.uri.path.startsWith('/api/')) {
            final port = request.uri.path.startsWith('/api/edu/') ? 8080 : 8000;
            final target = Uri.parse('http://10.0.2.2:$port${request.uri}');
            final upstream = await _client.openUrl(request.method, target);
            request.headers.forEach((key, values) {
              if (!['host', 'origin', 'connection'].contains(key)) {
                upstream.headers.set(key, values);
              }
            });
            upstream.headers.set('Origin', 'http://127.0.0.1:5173');
            await upstream.addStream(request);
            final response = await upstream.close();
            request.response.statusCode = response.statusCode;
            response.headers.forEach((key, values) {
              if (!['transfer-encoding', 'connection'].contains(key)) {
                request.response.headers.set(key, values);
              }
            });
            await response.pipe(request.response);
            return;
          }
          final path = request.uri.path == '/' ? 'index.html' : request.uri.path.substring(1);
          if (path.split('/').contains('..')) {
            request.response.statusCode = HttpStatus.forbidden;
          } else {
            final resource = path.startsWith('juego/')
                ? 'assets/juego/${path.substring(6)}'
                : 'assets/app/$path';
            final data = await rootBundle.load(resource);
            final mime = path.endsWith('.html') ? 'text/html' :
                path.endsWith('.js') ? 'application/javascript' :
                path.endsWith('.css') ? 'text/css' :
                path.endsWith('.json') ? 'application/json' :
                path.endsWith('.png') ? 'image/png' :
                path.endsWith('.svg') ? 'image/svg+xml' :
                path.endsWith('.woff2') ? 'font/woff2' :
                path.endsWith('.ttf') ? 'font/ttf' :
                path.endsWith('.mp3') ? 'audio/mpeg' :
                path.endsWith('.ogg') ? 'audio/ogg' : 'application/octet-stream';
            request.response.headers.set(HttpHeaders.contentTypeHeader, mime);
            request.response.add(data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
          }
        } catch (_) { request.response.statusCode = HttpStatus.notFound; }
        await request.response.close();
      });
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xfffff9ee))
        ..setNavigationDelegate(NavigationDelegate(onNavigationRequest: (request) {
          final uri = Uri.parse(request.url);
          return uri.host == '127.0.0.1' && uri.port == server.port
              ? NavigationDecision.navigate : NavigationDecision.prevent;
        }));
      await controller.loadRequest(Uri.parse('http://127.0.0.1:${server.port}/'));
      if (mounted) { setState(() => _controller = controller); }
    } catch (_) {
      if (mounted) { setState(() => _error = 'No se pudo abrir el juego. Cierra y vuelve a abrir Kusi.'); }
    }
  }

  @override
  void dispose() { _client.close(force: true); unawaited(_server?.close(force: true)); super.dispose(); }
  @override
  Widget build(BuildContext context) => ColoredBox(
    color: const Color(0xff8fd0ef),
    child: _controller != null ? WebViewWidget(controller: _controller!) : Center(
      child: Text(_error ?? 'Preparando el laberinto de Kusi…',
        style: const TextStyle(color: Color(0xff2f1d17), fontSize: 22)),
    ),
  );
}
