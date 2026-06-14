import 'package:flutter/material.dart';

import '../models/menu_item.dart';
import '../services/telegram_service.dart';

class OrderScreen extends StatefulWidget {
  final List<MenuItem> orderedItems;
  final String orderNote;
  final bool hasOrder;
  final VoidCallback onChangeOrder;
  final VoidCallback onClearOrder;

  const OrderScreen({
    super.key,
    required this.orderedItems,
    required this.orderNote,
    required this.hasOrder,
    required this.onChangeOrder,
    required this.onClearOrder,
  });

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  bool isCancelling = false;

  Future<void> cancelOrder() async {
    if (!widget.hasOrder) return;

    setState(() {
      isCancelling = true;
    });

    final result = await TelegramService.cancelOrder(
      selectedItems: widget.orderedItems,
      note: widget.orderNote,
    );

    if (!mounted) return;

    setState(() {
      isCancelling = false;
    });

    if (result['success'] == true) {
      widget.onClearOrder();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('បានលុបការកម្មង់ហើយ')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Cancel failed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.hasOrder) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'មិនទាន់មានការកម្មង់នៅឡើយទេ',
            style: TextStyle(fontSize: 16),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 55, 18, 20),
      child: Column(
        children: [
          const Text(
            'YOUR ORDER',
            style: TextStyle(
              fontSize: 21,
              letterSpacing: 1,
              fontWeight: FontWeight.w400,
            ),
          ),

          const SizedBox(height: 22),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xfffff1f1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xffffd1d1)),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'បានកម្មង់រួចហើយ។ អ្នកអាចផ្លាស់ប្តូរ ឬលុបការកម្មង់មុនពេលបិទ session។',
                    style: TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          Expanded(
            child: ListView.separated(
              itemCount: widget.orderedItems.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final item = widget.orderedItems[index];

                return Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.asset(
                        item.imageUrl,
                        width: 130,
                        height: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            width: 130,
                            height: 80,
                            color: Colors.grey.shade300,
                            child: const Icon(Icons.restaurant),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        item.name,
                        style: const TextStyle(fontSize: 15),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          if (widget.orderNote.trim().isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'កំណត់ចំណាំ: ${widget.orderNote}',
                style: const TextStyle(fontSize: 13),
              ),
            ),

          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.onChangeOrder,
                  icon: const Icon(Icons.edit),
                  label: const Text('ផ្លាស់ប្តូរ'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isCancelling ? null : cancelOrder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.delete_outline),
                  label: Text(isCancelling ? 'កំពុងលុប...' : 'លុប'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}