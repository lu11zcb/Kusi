import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'client_native.dart' if (dart.library.js_interop) 'client_web.dart';

class KusiApi {
  final http.Client client = createClient();
  final Map<String, String> cookies = {};
  final String base = kIsWeb ? Uri.base.origin : const String.fromEnvironment('KUSI_API', defaultValue: 'http://10.0.2.2:5180');
  String? csrf;
  Future<Map<String, dynamic>> request(String path, {Map<String, dynamic>? data}) async {
    final headers = <String, String>{'Accept':'application/json'};
    if (!kIsWeb && cookies.isNotEmpty) { headers['Cookie'] = cookies.entries.map((e) => '${e.key}=${e.value}').join('; '); }
    if(data!=null) { headers['Content-Type']='application/json'; if(csrf!=null){headers['X-CSRFToken']=csrf!;} }
    final uri=Uri.parse('$base$path');
    final response=await (data==null?client.get(uri,headers:headers):client.post(uri,headers:headers,body:jsonEncode(data))).timeout(const Duration(seconds:15));
    if(!kIsWeb) { for(final m in RegExp(r'(?:^|,\s*)(sessionid|csrftoken|XSRF-TOKEN)=([^;,]*)').allMatches(response.headers['set-cookie']??'')){cookies[m.group(1)!]=m.group(2)!;} }
    Map<String,dynamic> result;
    try { result=jsonDecode(response.body) as Map<String,dynamic>; }
    catch(_){throw Exception('No pudimos conectar con Kusi. Inténtalo de nuevo.');}
    if(response.statusCode>=400){throw Exception(result['mensaje']??'No se pudo completar la solicitud.');}
    if(result['csrf_token'] is String){csrf=result['csrf_token'];}
    return result;
  }
  Future<Map<String,dynamic>?> session() async => (await request('/api/acceso/sesion/'))['usuario'] as Map<String,dynamic>?;
  Future<Map<String,dynamic>> login(String dni,String password) async {
    await session();
    final user=(await request('/api/acceso/ingreso/',data:{'dni':dni,'contrasena':password}))['usuario'] as Map<String,dynamic>;
    if(!(user['roles'] as List).contains('estudiante')){await logout();throw Exception('Este acceso es para estudiantes.');}
    return user;
  }
  Future<void> logout() async {try{await request('/api/acceso/salida/',data:{});}finally{cookies.clear();csrf=null;}}
  Future<List<Map<String,dynamic>>> games() async => ((await request('/api/edu/estudiante/juegos/'))['juegos'] as List).cast<Map<String,dynamic>>();
}
