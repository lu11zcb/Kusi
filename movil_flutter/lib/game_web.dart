import 'dart:ui_web' as ui_web;
import 'package:web/web.dart' as web;
import 'package:flutter/widgets.dart';
class KusiGame extends StatefulWidget {
  const KusiGame({super.key});
  @override
  State<KusiGame> createState()=>_KusiGameState();
}
class _KusiGameState extends State<KusiGame> {
  static int next=0;
  late final String view='kusi-game-${next++}';
  @override
  void initState(){super.initState();ui_web.platformViewRegistry.registerViewFactory(view,(int id)=>web.HTMLIFrameElement()..src='/assets/assets/app/index.html'..title='Kusi Flutter'..style.border='none'..style.width='100%'..style.height='100%');}
  @override
  Widget build(BuildContext context)=>HtmlElementView(viewType:view);
}
