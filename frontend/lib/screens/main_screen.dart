import 'package:flutter/material.dart';

import '../models/menu_item.dart';
import 'cart_screen.dart';
import 'home_screen.dart';
import 'order_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int selectedIndex = 0;

  final List<MenuItem> cartItems = [];
  List<MenuItem> orderedItems = [];

  String orderNote = '';
  bool hasOrder = false;
  bool isChangingOrder = false;

  void addToCart(MenuItem item) {
    final alreadyAdded = cartItems.any((cartItem) => cartItem.id == item.id);

    if (alreadyAdded) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('មុខម្ហូបនេះបានជ្រើសរួចហើយ')),
      );
      return;
    }

    setState(() {
      cartItems.add(item);
    });
  }

  void removeFromCart(MenuItem item) {
    setState(() {
      cartItems.removeWhere((cartItem) => cartItem.id == item.id);
    });
  }

  void clearCart() {
    setState(() {
      cartItems.clear();
    });
  }

  void saveOrder({
    required List<MenuItem> items,
    required String note,
  }) {
    setState(() {
      orderedItems = List<MenuItem>.from(items);
      orderNote = note;
      hasOrder = true;
      isChangingOrder = false;
      cartItems.clear();
      selectedIndex = 2;
    });
  }

  void changeOrder() {
    setState(() {
      cartItems.clear();
      cartItems.addAll(orderedItems);
      isChangingOrder = true;
      selectedIndex = 1;
    });
  }

  void clearOrder() {
    setState(() {
      orderedItems = [];
      orderNote = '';
      hasOrder = false;
      isChangingOrder = false;
      cartItems.clear();
      selectedIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      HomeScreen(
        cartItems: cartItems,
        onAddToCart: addToCart,
      ),
      CartScreen(
        cartItems: cartItems,
        onRemove: removeFromCart,
        onClearCart: clearCart,
        isChangingOrder: isChangingOrder,
        onOrderSuccess: saveOrder,
      ),
      OrderScreen(
        orderedItems: orderedItems,
        orderNote: orderNote,
        hasOrder: hasOrder,
        onChangeOrder: changeOrder,
        onClearOrder: clearOrder,
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xffd4adad),
      body: SafeArea(
        child: Center(
          child: Container(
            width: 390,
            height: 844,
            color: Colors.white,
            child: Stack(
              children: [
                Positioned.fill(
                  bottom: 70,
                  child: screens[selectedIndex],
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: BottomNavigationBar(
                    currentIndex: selectedIndex,
                    onTap: (index) {
                      setState(() {
                        selectedIndex = index;
                      });
                    },
                    selectedItemColor: Colors.red,
                    unselectedItemColor: Colors.black,
                    items: [
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.home_outlined),
                        label: 'Home',
                      ),
                      BottomNavigationBarItem(
                        icon: Badge(
                          isLabelVisible: cartItems.isNotEmpty,
                          label: Text(cartItems.length.toString()),
                          child: const Icon(Icons.shopping_cart_outlined),
                        ),
                        label: 'Cart',
                      ),
                      BottomNavigationBarItem(
                        icon: Badge(
                          isLabelVisible: hasOrder,
                          label: const Text('1'),
                          child: const Icon(Icons.receipt_long_outlined),
                        ),
                        label: 'Order',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}