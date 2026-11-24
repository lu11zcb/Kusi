import 'package:flutter/widgets.dart';
import 'package:flutter/services.dart';
import 'game_native.dart' if (dart.library.js_interop) 'game_web.dart' as mobile;
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const Directionality(textDirection:TextDirection.ltr,child:mobile.KusiGame()));
}
