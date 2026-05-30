import 'package:flutter/material.dart';

import '../data/menu_data.dart';
import '../models/menu_item.dart';
import '../widgets/menu_card.dart';

class HomeScreen extends StatefulWidget {
  final List<MenuItem> cartItems;
  final void Function(MenuItem item) onAddToCart;
  final bool autoFocusSearch;

  const HomeScreen({
    super.key,
    required this.cartItems,
    required this.onAddToCart,
    this.autoFocusSearch = false,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController searchController = TextEditingController();
  late List<MenuItem> filteredItems;

  @override
  void initState() {
    super.initState();
    filteredItems = allMenuItems;
  }

  void searchMenu(String value) {
    final keyword = value.trim();

    setState(() {
      if (keyword.isEmpty) {
        filteredItems = allMenuItems;
      } else {
        filteredItems = allMenuItems.where((item) {
          return item.name.contains(keyword);
        }).toList();
      }
    });
  }

  bool isInCart(MenuItem item) {
    return widget.cartItems.any((cartItem) => cartItem.id == item.id);
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 16),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: TextField(
            controller: searchController,
            autofocus: widget.autoFocusSearch,
            onChanged: searchMenu,
            decoration: InputDecoration(
              hintText: 'Search',
              suffixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: const Color(0xfff0f0f0),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(7),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
            ),
          ),
        ),

        const SizedBox(height: 14),

        Expanded(
          child: filteredItems.isEmpty
              ? const Center(
                  child: Text(
                    'រកមិនឃើញមុខម្ហូបនេះទេ',
                    style: TextStyle(fontSize: 16),
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  itemCount: filteredItems.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.74,
                  ),
                  itemBuilder: (context, index) {
                    final item = filteredItems[index];
                    final added = isInCart(item);

                    return MenuCard(
                      item: item,
                      added: added,
                      onTap: () {
                        widget.onAddToCart(item);
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }
}