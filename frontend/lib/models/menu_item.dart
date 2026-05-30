class MenuItem {
  final int id;
  final String name;
  final String imageUrl;

  const MenuItem({
    required this.id,
    required this.name,
    required this.imageUrl,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'imageUrl': imageUrl,
    };
  }
}