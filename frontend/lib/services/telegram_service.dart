import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/menu_item.dart';

class TelegramService {
  static const String baseUrl = 'https://family-menu-m73p.onrender.com';

  static Future<Map<String, dynamic>> sendMenuToTelegram({
    required List<MenuItem> selectedItems,
    required String note,
    required String action,
  }) async {
    final selectedItemsJson =
        selectedItems.map((item) => item.toJson()).toList();

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/send-menu'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'selectedItems': selectedItemsJson,
          'note': note,
          'action': action,
        }),
      );

      final data = jsonDecode(response.body);

      return {
        'success': response.statusCode == 200 && data['success'] == true,
        'message': data['message'] ?? 'Unknown response',
      };
    } catch (error) {
      return {
        'success': false,
        'message': 'Cannot connect to backend: $error',
      };
    }
  }

  static Future<Map<String, dynamic>> cancelOrder({
    required List<MenuItem> selectedItems,
    required String note,
  }) async {
    final selectedItemsJson =
        selectedItems.map((item) => item.toJson()).toList();

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/cancel-order'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'selectedItems': selectedItemsJson,
          'note': note,
        }),
      );

      final data = jsonDecode(response.body);

      return {
        'success': response.statusCode == 200 && data['success'] == true,
        'message': data['message'] ?? 'Unknown response',
      };
    } catch (error) {
      return {
        'success': false,
        'message': 'Cannot connect to backend: $error',
      };
    }
  }
}