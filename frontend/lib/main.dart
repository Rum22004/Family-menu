import 'package:flutter/material.dart';

import 'screens/main_screen.dart';

void main() {
  runApp(const FamilyMenuApp());
}

class FamilyMenuApp extends StatelessWidget {
  const FamilyMenuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ញ៉ាំអីថ្ងៃនេះ?',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Arial',
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.red),
        useMaterial3: true,
      ),
      home: const MainScreen(),
    );
  }
}