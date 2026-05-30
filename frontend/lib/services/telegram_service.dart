import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/menu_item.dart';

class TelegramService {
  static const String baseUrl = 'https://family-menu-1tva.onrender.com/';

  static Future<Map<String, dynamic>> sendMenuToTelegram({
    required List<MenuItem> selectedItems,
    required String note,
  }) async {
    final selectedItemsJson =
        selectedItems.map((item) => item.toJson()).toList();

    final response = await http.post(
      Uri.parse('$baseUrl/api/send-menu'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'selectedItems': selectedItemsJson,
        'note': note,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200 && data['success'] == true) {
      return {
        'success': true,
        'message': data['message'],
      };
    }

    return {
      'success': false,
      'message': data['message'] ?? 'ផ្ញើទៅ Telegram មិនបានទេ',
    };
  }
}