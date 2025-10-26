import 'package:flutter/material.dart';
import 'package:http/http.dart' as http; // 引入 http 包
import 'dart:convert'; // 引入 json 编解码
import 'dart:math'; // 引入随机数

// --- 你的后端服务器地址 ---
// !!! 重要提示 !!!
// 如果你使用 Android 模拟器, 请使用 '10.0.2.2'
// 如果你使用 iOS 模拟器或桌面端, 请使用 '127.0.0.1'
const String backendUrl = 'http://127.0.0.1:8000/interpret';

void main() {
  runApp(const TarotApp());
}

class TarotApp extends StatelessWidget {
  const TarotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Tarot',
      theme: ThemeData(
        // 这是你定义“清新风格”的开始
        scaffoldBackgroundColor: const Color(0xFFF5F5F5), // 柔和的背景色
        primarySwatch: Colors.blue,
        fontFamily: 'YourFreshFont', // 在这里指定你的自定义字体
      ),
      home: const TarotHomePage(),
    );
  }
}

class TarotHomePage extends StatefulWidget {
  const TarotHomePage({super.key});

  @override
  _TarotHomePageState createState() => _TarotHomePageState();
}

class _TarotHomePageState extends State<TarotHomePage> {
  // 状态变量
  String _interpretation = "请抽取一张牌，获得你的指引。";
  String _drawnCardName = "";
  bool _isReversed = false;
  bool _isLoading = false;

  // 简化的牌库 (只包含大阿卡那)
  final List<String> _majorArcana = [
    "愚人", "魔术师", "女祭司", "皇后", "皇帝", "教皇", "恋人",
    "战车", "力量", "隐士", "命运之轮", "正义", "倒吊人", "死神",
    "节制", "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界"
  ];
  final Random _random = Random();

  // --- 核心功能：抽牌并获取解读 ---
  Future<void> _drawCardAndInterpret() async {
    setState(() {
      _isLoading = true;
      _interpretation = "AI 正在为你解读...";
    });

    try {
      // 1. 模拟抽牌
      _drawnCardName = _majorArcana[_random.nextInt(_majorArcana.length)];
      _isReversed = _random.nextBool(); // 随机决定正逆位

      // 2. 准备发送到后端的请求
      final response = await http.post(
        Uri.parse(backendUrl),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonEncode({
          'card_name': _drawnCardName,
          'is_reversed': _isReversed,
          'question': "关于我今天的运势" // TODO: 允许用户输入问题
        }),
      );
      
      // 3. 处理响应
      if (response.statusCode == 200) {
        // 使用 utf8.decode 来正确处理中文
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          _interpretation = data['interpretation'];
        });
      } else {
        // 处理后端错误
        setState(() {
          _interpretation = "解读失败 (错误码: ${response.statusCode})";
        });
      }
    } catch (e) {
      // 处理网络错误
      setState(() {
        // 最常见的错误：Flutter 无法连接到你的本地 Python 服务器
        _interpretation = "连接后端失败。\n请确保你的Python服务器 (main.py) 正在运行。\n错误: $e";
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI 塔罗牌'),
        backgroundColor: Colors.white,
        elevation: 1,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // 1. 卡牌显示区域 (这是实现清新风格的关键)
            // 你应该在这里用你精美的卡牌图片替换这个 Container
            Container(
              height: 300,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.blueGrey.shade100),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    spreadRadius: 2,
                    blurRadius: 5,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  _isLoading ? "..." : (_drawnCardName.isEmpty ? "牌背" : "$_drawnCardName\n${_isReversed ? '(逆位)' : '(正位)'}"),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 30),

            // 2. 解读显示区域
            Expanded(
              child: SingleChildScrollView(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : Text(
                          _interpretation,
                          style: TextStyle(fontSize: 16, height: 1.5, color: Colors.black.withOpacity(0.7)),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 3. 抽牌按钮
            ElevatedButton(
              // 如果正在加载，则禁用按钮
              onPressed: _isLoading ? null : _drawCardAndInterpret,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blueAccent, // 主题色
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                elevation: 0,
              ),
              child: const Text(
                '抽一张牌',
                style: TextStyle(fontSize: 18, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}