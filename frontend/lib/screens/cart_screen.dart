import 'package:flutter/material.dart';

import '../models/menu_item.dart';
import '../services/telegram_service.dart';
import '../widgets/success_dialog.dart';

class CartScreen extends StatefulWidget {
  final List<MenuItem> cartItems;
  final void Function(MenuItem item) onRemove;
  final VoidCallback onClearCart;
  final bool isChangingOrder;

  final void Function({
    required List<MenuItem> items,
    required String note,
  }) onOrderSuccess;

  const CartScreen({
    super.key,
    required this.cartItems,
    required this.onRemove,
    required this.onClearCart,
    required this.isChangingOrder,
    required this.onOrderSuccess,
  });

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool isLoading = false;
  final TextEditingController noteController = TextEditingController();

  Future<void> sendToTelegram() async {
    if (widget.cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('សូមជ្រើសរើសមុខម្ហូបជាមុនសិន')),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      final orderedSnapshot = List<MenuItem>.from(widget.cartItems);
      final noteSnapshot = noteController.text.trim();

      final result = await TelegramService.sendMenuToTelegram(
        selectedItems: orderedSnapshot,
        note: noteSnapshot,
        action: widget.isChangingOrder ? 'change' : 'new',
      );

      if (result['success'] == true) {
        widget.onOrderSuccess(
          items: orderedSnapshot,
          note: noteSnapshot,
        );

        noteController.clear();

        if (!mounted) return;
        showSuccessDialog(context);
      } else {
        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'ផ្ញើទៅ Telegram មិនបានទេ'),
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('មិនអាចភ្ជាប់ទៅ Backend បានទេ។'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final buttonText = widget.isChangingOrder ? 'ផ្ញើការផ្លាស់ប្តូរ' : 'ទិញ';

    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 50, 18, 20),
      child: Column(
        children: [
          Text(
            widget.isChangingOrder ? 'CHANGE ORDER' : 'YOUR CART',
            style: const TextStyle(
              fontSize: 21,
              letterSpacing: 1,
              fontWeight: FontWeight.w400,
            ),
          ),

          const SizedBox(height: 26),

          if (widget.isChangingOrder)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xfffff1f1),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xffffc7c7)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.edit_note, color: Colors.red),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'អ្នកកំពុងផ្លាស់ប្តូរការកម្មង់។ ពេលផ្ញើទៅ Telegram វានឹងបង្ហាញថាជាការផ្លាស់ប្តូរ។',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

          Expanded(
            child: widget.cartItems.isEmpty
                ? const Center(
                    child: Text(
                      'មិនទាន់មានមុខម្ហូបនៅឡើយទេ',
                      style: TextStyle(fontSize: 16),
                    ),
                  )
                : ListView.separated(
                    itemCount: widget.cartItems.length,
                    separatorBuilder: (context, index) {
                      return const SizedBox(height: 20);
                    },
                    itemBuilder: (context, index) {
                      final item = widget.cartItems[index];

                      return Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.asset(
                              item.imageUrl,
                              width: 150,
                              height: 88,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  width: 150,
                                  height: 88,
                                  color: Colors.grey.shade300,
                                  alignment: Alignment.center,
                                  child: const Icon(Icons.restaurant),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              item.name,
                              style: const TextStyle(
                                fontSize: 16,
                                color: Colors.black,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () => widget.onRemove(item),
                            icon: const Icon(
                              Icons.delete_outline,
                              color: Colors.red,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xfffff1f1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xffffd1d1),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.edit_note,
                      color: Colors.red,
                      size: 22,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'កំណត់ចំណាំ',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: noteController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'ឧទាហរណ៍: កុំដាក់ម្ទេស / ចង់បានស៊ុបក្តៅៗ',
                    hintStyle: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 13,
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          SizedBox(
            width: 210,
            height: 42,
            child: ElevatedButton(
              onPressed:
                  isLoading || widget.cartItems.isEmpty ? null : sendToTelegram,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                disabledBackgroundColor: Colors.grey,
                foregroundColor: Colors.white,
                elevation: 4,
                shadowColor: Colors.red.withOpacity(0.4),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                isLoading ? 'កំពុងផ្ញើ...' : buttonText,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}