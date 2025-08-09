export class RecipeIntelligenceAgent {
  private static recipes: Recipe[] = [
    {
      id: '1',
      name: 'Grilled Chicken with Quinoa',
      description: 'High-protein, low-carb meal perfect for diabetes management',
      image: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 25,
      servings: 4,
      difficulty: 'easy',
      calories: 320,
      carbs: 18,
      protein: 35,
      fat: 12,
      fiber: 4,
      glycemicLoad: 8,
      diabeticFriendly: true,
      tags: ['high-protein', 'low-carb', 'gluten-free'],
      ingredients: [
        { name: 'Chicken breast', amount: '4', unit: 'pieces' },
        { name: 'Quinoa', amount: '1', unit: 'cup' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Garlic', amount: '3', unit: 'cloves' },
        { name: 'Lemon juice', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Season chicken with salt, pepper, and garlic',
        'Grill chicken for 6-7 minutes per side',
        'Cook quinoa according to package directions',
        'Drizzle with olive oil and lemon juice',
        'Serve hot'
      ],
      nutritionPerServing: {
        calories: 320,
        carbs: 18,
        protein: 35,
        fat: 12,
        fiber: 4,
        sugars: 2
      }
    },
    {
      id: '2',
      name: 'Mediterranean Salmon Bowl',
      description: 'Omega-3 rich salmon with fresh vegetables',
      image: 'https://images.pexels.com/photos/1516415/pexels-photo-1516415.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      difficulty: 'easy',
      calories: 380,
      carbs: 12,
      protein: 32,
      fat: 22,
      fiber: 6,
      glycemicLoad: 5,
      diabeticFriendly: true,
      tags: ['omega-3', 'mediterranean', 'heart-healthy'],
      ingredients: [
        { name: 'Salmon fillet', amount: '2', unit: 'pieces' },
        { name: 'Mixed greens', amount: '4', unit: 'cups' },
        { name: 'Cherry tomatoes', amount: '1', unit: 'cup' },
        { name: 'Cucumber', amount: '1', unit: 'medium' },
        { name: 'Feta cheese', amount: '1/4', unit: 'cup' }
      ],
      instructions: [
        'Season salmon with herbs and olive oil',
        'Bake at 400°F for 12-15 minutes',
        'Prepare salad with greens, tomatoes, cucumber',
        'Top with flaked salmon and feta',
        'Drizzle with lemon vinaigrette'
      ],
      nutritionPerServing: {
        calories: 380,
        carbs: 12,
        protein: 32,
        fat: 22,
        fiber: 6,
        sugars: 8
      }
    },
    {
      id: '3',
      name: 'Cauliflower Rice Stir-Fry',
      description: 'Low-carb vegetable stir-fry with cauliflower rice',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 12,
      servings: 3,
      difficulty: 'easy',
      calories: 180,
      carbs: 8,
      protein: 12,
      fat: 10,
      fiber: 5,
      glycemicLoad: 3,
      diabeticFriendly: true,
      tags: ['low-carb', 'vegetarian', 'keto-friendly'],
      ingredients: [
        { name: 'Cauliflower rice', amount: '3', unit: 'cups' },
        { name: 'Mixed vegetables', amount: '2', unit: 'cups' },
        { name: 'Tofu or chicken', amount: '6', unit: 'oz' },
        { name: 'Soy sauce', amount: '2', unit: 'tbsp' },
        { name: 'Sesame oil', amount: '1', unit: 'tbsp' }
      ],
      instructions: [
        'Heat oil in large pan or wok',
        'Add protein and cook until done',
        'Add vegetables and stir-fry 3-4 minutes',
        'Add cauliflower rice and cook 2-3 minutes',
        'Season with soy sauce and serve'
      ],
      nutritionPerServing: {
        calories: 180,
        carbs: 8,
        protein: 12,
        fat: 10,
        fiber: 5,
        sugars: 4
      }
    },
    {
      id: '4',
      name: 'Greek Yogurt Berry Parfait',
      description: 'High-protein breakfast with antioxidant-rich berries',
      image: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      difficulty: 'easy',
      calories: 220,
      carbs: 25,
      protein: 20,
      fat: 4,
      fiber: 8,
      glycemicLoad: 12,
      diabeticFriendly: true,
      tags: ['high-protein', 'breakfast', 'antioxidants'],
      ingredients: [
        { name: 'Greek yogurt', amount: '1', unit: 'cup' },
        { name: 'Mixed berries', amount: '1/2', unit: 'cup' },
        { name: 'Chia seeds', amount: '1', unit: 'tbsp' },
        { name: 'Almonds', amount: '10', unit: 'pieces' },
        { name: 'Cinnamon', amount: '1/4', unit: 'tsp' }
      ],
      instructions: [
        'Layer half the yogurt in a glass',
        'Add half the berries',
        'Sprinkle with chia seeds',
        'Add remaining yogurt and berries',
        'Top with almonds and cinnamon'
      ],
      nutritionPerServing: {
        calories: 220,
        carbs: 25,
        protein: 20,
        fat: 4,
        fiber: 8,
        sugars: 18
      }
    },
    {
      id: '5',
      name: 'Zucchini Noodle Bolognese',
      description: 'Low-carb pasta alternative with rich meat sauce',
      image: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 20,
      cookTime: 30,
      servings: 4,
      difficulty: 'medium',
      calories: 280,
      carbs: 12,
      protein: 25,
      fat: 16,
      fiber: 4,
      glycemicLoad: 6,
      diabeticFriendly: true,
      tags: ['low-carb', 'high-protein', 'italian'],
      ingredients: [
        { name: 'Zucchini', amount: '4', unit: 'large' },
        { name: 'Ground turkey', amount: '1', unit: 'lb' },
        { name: 'Tomato sauce', amount: '2', unit: 'cups' },
        { name: 'Onion', amount: '1', unit: 'medium' },
        { name: 'Garlic', amount: '4', unit: 'cloves' }
      ],
      instructions: [
        'Spiralize zucchini into noodles',
        'Brown ground turkey with onions',
        'Add garlic and tomato sauce',
        'Simmer for 20 minutes',
        'Serve over zucchini noodles'
      ],
      nutritionPerServing: {
        calories: 280,
        carbs: 12,
        protein: 25,
        fat: 16,
        fiber: 4,
        sugars: 8
      }
    },
    {
      id: '6',
      name: 'Avocado Egg Salad',
      description: 'Creamy egg salad with healthy fats from avocado',
      image: 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 10,
      servings: 2,
      difficulty: 'easy',
      calories: 320,
      carbs: 8,
      protein: 18,
      fat: 24,
      fiber: 7,
      glycemicLoad: 2,
      diabeticFriendly: true,
      tags: ['keto-friendly', 'high-fat', 'low-carb'],
      ingredients: [
        { name: 'Hard-boiled eggs', amount: '4', unit: 'large' },
        { name: 'Avocado', amount: '1', unit: 'large' },
        { name: 'Lemon juice', amount: '1', unit: 'tbsp' },
        { name: 'Celery', amount: '2', unit: 'stalks' },
        { name: 'Dijon mustard', amount: '1', unit: 'tsp' }
      ],
      instructions: [
        'Boil eggs for 10 minutes, then cool',
        'Mash avocado with lemon juice',
        'Chop eggs and celery',
        'Mix all ingredients together',
        'Season with salt and pepper'
      ],
      nutritionPerServing: {
        calories: 320,
        carbs: 8,
        protein: 18,
        fat: 24,
        fiber: 7,
        sugars: 2
      }
    },
    {
      id: '7',
      name: 'Lentil Vegetable Soup',
      description: 'Fiber-rich soup with plant-based protein',
      image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 35,
      servings: 6,
      difficulty: 'easy',
      calories: 240,
      carbs: 35,
      protein: 15,
      fat: 3,
      fiber: 12,
      glycemicLoad: 15,
      diabeticFriendly: true,
      tags: ['high-fiber', 'vegetarian', 'plant-based'],
      ingredients: [
        { name: 'Red lentils', amount: '1', unit: 'cup' },
        { name: 'Vegetable broth', amount: '4', unit: 'cups' },
        { name: 'Carrots', amount: '2', unit: 'large' },
        { name: 'Celery', amount: '3', unit: 'stalks' },
        { name: 'Spinach', amount: '2', unit: 'cups' }
      ],
      instructions: [
        'Sauté vegetables in pot',
        'Add lentils and broth',
        'Bring to boil, then simmer 25 minutes',
        'Add spinach in last 5 minutes',
        'Season and serve hot'
      ],
      nutritionPerServing: {
        calories: 240,
        carbs: 35,
        protein: 15,
        fat: 3,
        fiber: 12,
        sugars: 6
      }
    },
    {
      id: '8',
      name: 'Baked Cod with Herbs',
      description: 'Light, flaky fish with Mediterranean herbs',
      image: 'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      difficulty: 'easy',
      calories: 180,
      carbs: 2,
      protein: 28,
      fat: 6,
      fiber: 0,
      glycemicLoad: 0,
      diabeticFriendly: true,
      tags: ['low-carb', 'high-protein', 'omega-3'],
      ingredients: [
        { name: 'Cod fillets', amount: '4', unit: 'pieces' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Fresh herbs', amount: '1/4', unit: 'cup' },
        { name: 'Lemon', amount: '1', unit: 'medium' },
        { name: 'Garlic', amount: '2', unit: 'cloves' }
      ],
      instructions: [
        'Preheat oven to 400°F',
        'Place cod in baking dish',
        'Drizzle with oil and lemon',
        'Top with herbs and garlic',
        'Bake 15-20 minutes until flaky'
      ],
      nutritionPerServing: {
        calories: 180,
        carbs: 2,
        protein: 28,
        fat: 6,
        fiber: 0,
        sugars: 1
      }
    },
    {
      id: '9',
      name: 'Spinach and Mushroom Frittata',
      description: 'Protein-packed egg dish perfect for any meal',
      image: 'https://images.pexels.com/photos/824635/pexels-photo-824635.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 25,
      servings: 6,
      difficulty: 'medium',
      calories: 220,
      carbs: 6,
      protein: 16,
      fat: 15,
      fiber: 2,
      glycemicLoad: 2,
      diabeticFriendly: true,
      tags: ['high-protein', 'vegetarian', 'low-carb'],
      ingredients: [
        { name: 'Eggs', amount: '8', unit: 'large' },
        { name: 'Spinach', amount: '3', unit: 'cups' },
        { name: 'Mushrooms', amount: '2', unit: 'cups' },
        { name: 'Cheese', amount: '1/2', unit: 'cup' },
        { name: 'Onion', amount: '1', unit: 'small' }
      ],
      instructions: [
        'Sauté vegetables in oven-safe pan',
        'Beat eggs and pour over vegetables',
        'Add cheese on top',
        'Cook on stove 5 minutes',
        'Finish in 375°F oven for 15 minutes'
      ],
      nutritionPerServing: {
        calories: 220,
        carbs: 6,
        protein: 16,
        fat: 15,
        fiber: 2,
        sugars: 3
      }
    },
    {
      id: '10',
      name: 'Turkey and Vegetable Meatballs',
      description: 'Lean protein meatballs with hidden vegetables',
      image: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 20,
      cookTime: 25,
      servings: 4,
      difficulty: 'medium',
      calories: 260,
      carbs: 8,
      protein: 30,
      fat: 12,
      fiber: 3,
      glycemicLoad: 4,
      diabeticFriendly: true,
      tags: ['high-protein', 'hidden-vegetables', 'kid-friendly'],
      ingredients: [
        { name: 'Ground turkey', amount: '1', unit: 'lb' },
        { name: 'Zucchini', amount: '1', unit: 'medium' },
        { name: 'Carrots', amount: '1', unit: 'large' },
        { name: 'Egg', amount: '1', unit: 'large' },
        { name: 'Almond flour', amount: '1/4', unit: 'cup' }
      ],
      instructions: [
        'Grate zucchini and carrots finely',
        'Mix with turkey, egg, and flour',
        'Form into 16 meatballs',
        'Bake at 400°F for 20-25 minutes',
        'Serve with marinara sauce'
      ],
      nutritionPerServing: {
        calories: 260,
        carbs: 8,
        protein: 30,
        fat: 12,
        fiber: 3,
        sugars: 4
      }
    },
    {
      id: '11',
      name: 'Chia Seed Pudding',
      description: 'High-fiber breakfast pudding with omega-3s',
      image: 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 5,
      cookTime: 0,
      servings: 2,
      difficulty: 'easy',
      calories: 180,
      carbs: 15,
      protein: 8,
      fat: 10,
      fiber: 12,
      glycemicLoad: 6,
      diabeticFriendly: true,
      tags: ['high-fiber', 'omega-3', 'make-ahead'],
      ingredients: [
        { name: 'Chia seeds', amount: '1/4', unit: 'cup' },
        { name: 'Almond milk', amount: '1', unit: 'cup' },
        { name: 'Vanilla extract', amount: '1/2', unit: 'tsp' },
        { name: 'Stevia', amount: '1', unit: 'packet' },
        { name: 'Berries', amount: '1/2', unit: 'cup' }
      ],
      instructions: [
        'Mix chia seeds with almond milk',
        'Add vanilla and stevia',
        'Refrigerate overnight',
        'Stir well before serving',
        'Top with fresh berries'
      ],
      nutritionPerServing: {
        calories: 180,
        carbs: 15,
        protein: 8,
        fat: 10,
        fiber: 12,
        sugars: 8
      }
    },
    {
      id: '12',
      name: 'Roasted Vegetable Medley',
      description: 'Colorful mix of roasted vegetables with herbs',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      difficulty: 'easy',
      calories: 120,
      carbs: 18,
      protein: 4,
      fat: 4,
      fiber: 6,
      glycemicLoad: 8,
      diabeticFriendly: true,
      tags: ['vegetarian', 'high-fiber', 'antioxidants'],
      ingredients: [
        { name: 'Bell peppers', amount: '2', unit: 'large' },
        { name: 'Zucchini', amount: '2', unit: 'medium' },
        { name: 'Eggplant', amount: '1', unit: 'medium' },
        { name: 'Red onion', amount: '1', unit: 'large' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Cut vegetables into chunks',
        'Toss with olive oil and herbs',
        'Spread on baking sheet',
        'Roast at 425°F for 25-30 minutes',
        'Season with salt and pepper'
      ],
      nutritionPerServing: {
        calories: 120,
        carbs: 18,
        protein: 4,
        fat: 4,
        fiber: 6,
        sugars: 12
      }
    },
    {
      id: '13',
      name: 'Almond-Crusted Chicken',
      description: 'Crispy chicken with healthy almond coating',
      image: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 25,
      servings: 4,
      difficulty: 'medium',
      calories: 340,
      carbs: 6,
      protein: 38,
      fat: 18,
      fiber: 3,
      glycemicLoad: 2,
      diabeticFriendly: true,
      tags: ['high-protein', 'gluten-free', 'low-carb'],
      ingredients: [
        { name: 'Chicken breasts', amount: '4', unit: 'pieces' },
        { name: 'Almond flour', amount: '1', unit: 'cup' },
        { name: 'Parmesan cheese', amount: '1/4', unit: 'cup' },
        { name: 'Eggs', amount: '2', unit: 'large' },
        { name: 'Italian herbs', amount: '1', unit: 'tbsp' }
      ],
      instructions: [
        'Mix almond flour, cheese, and herbs',
        'Dip chicken in beaten eggs',
        'Coat with almond mixture',
        'Bake at 375°F for 20-25 minutes',
        'Check internal temperature reaches 165°F'
      ],
      nutritionPerServing: {
        calories: 340,
        carbs: 6,
        protein: 38,
        fat: 18,
        fiber: 3,
        sugars: 2
      }
    },
    {
      id: '14',
      name: 'Cucumber Avocado Salad',
      description: 'Refreshing salad with healthy fats',
      image: 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 10,
      cookTime: 0,
      servings: 3,
      difficulty: 'easy',
      calories: 160,
      carbs: 12,
      protein: 3,
      fat: 12,
      fiber: 8,
      glycemicLoad: 4,
      diabeticFriendly: true,
      tags: ['raw', 'vegan', 'hydrating'],
      ingredients: [
        { name: 'Cucumbers', amount: '2', unit: 'large' },
        { name: 'Avocado', amount: '1', unit: 'large' },
        { name: 'Red onion', amount: '1/4', unit: 'small' },
        { name: 'Lime juice', amount: '2', unit: 'tbsp' },
        { name: 'Fresh dill', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Slice cucumbers thinly',
        'Dice avocado and red onion',
        'Combine all ingredients',
        'Dress with lime juice',
        'Garnish with fresh dill'
      ],
      nutritionPerServing: {
        calories: 160,
        carbs: 12,
        protein: 3,
        fat: 12,
        fiber: 8,
        sugars: 6
      }
    },
    {
      id: '15',
      name: 'Stuffed Bell Peppers',
      description: 'Colorful peppers stuffed with lean protein and vegetables',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 20,
      cookTime: 35,
      servings: 4,
      difficulty: 'medium',
      calories: 280,
      carbs: 15,
      protein: 25,
      fat: 12,
      fiber: 5,
      glycemicLoad: 8,
      diabeticFriendly: true,
      tags: ['high-protein', 'colorful', 'complete-meal'],
      ingredients: [
        { name: 'Bell peppers', amount: '4', unit: 'large' },
        { name: 'Ground turkey', amount: '1', unit: 'lb' },
        { name: 'Cauliflower rice', amount: '2', unit: 'cups' },
        { name: 'Tomato sauce', amount: '1/2', unit: 'cup' },
        { name: 'Mozzarella cheese', amount: '1/2', unit: 'cup' }
      ],
      instructions: [
        'Cut tops off peppers and remove seeds',
        'Brown turkey with seasonings',
        'Mix with cauliflower rice and sauce',
        'Stuff peppers with mixture',
        'Bake covered 30 minutes, add cheese last 5 minutes'
      ],
      nutritionPerServing: {
        calories: 280,
        carbs: 15,
        protein: 25,
        fat: 12,
        fiber: 5,
        sugars: 10
      }
    },
    {
      id: '16',
      name: 'Asian Lettuce Wraps',
      description: 'Light and flavorful wraps with Asian-inspired filling',
      image: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 10,
      servings: 4,
      difficulty: 'easy',
      calories: 200,
      carbs: 8,
      protein: 22,
      fat: 10,
      fiber: 3,
      glycemicLoad: 3,
      diabeticFriendly: true,
      tags: ['low-carb', 'asian-inspired', 'fresh'],
      ingredients: [
        { name: 'Ground chicken', amount: '1', unit: 'lb' },
        { name: 'Butter lettuce', amount: '1', unit: 'head' },
        { name: 'Water chestnuts', amount: '1/2', unit: 'cup' },
        { name: 'Green onions', amount: '3', unit: 'stalks' },
        { name: 'Ginger', amount: '1', unit: 'tbsp' }
      ],
      instructions: [
        'Cook ground chicken until done',
        'Add ginger and water chestnuts',
        'Season with low-sodium soy sauce',
        'Separate lettuce leaves',
        'Serve chicken mixture in lettuce cups'
      ],
      nutritionPerServing: {
        calories: 200,
        carbs: 8,
        protein: 22,
        fat: 10,
        fiber: 3,
        sugars: 4
      }
    },
    {
      id: '17',
      name: 'Herb-Roasted Pork Tenderloin',
      description: 'Lean pork with aromatic herb crust',
      image: 'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 25,
      servings: 4,
      difficulty: 'medium',
      calories: 290,
      carbs: 3,
      protein: 32,
      fat: 15,
      fiber: 1,
      glycemicLoad: 1,
      diabeticFriendly: true,
      tags: ['high-protein', 'herb-crusted', 'elegant'],
      ingredients: [
        { name: 'Pork tenderloin', amount: '1.5', unit: 'lbs' },
        { name: 'Fresh rosemary', amount: '2', unit: 'tbsp' },
        { name: 'Fresh thyme', amount: '2', unit: 'tbsp' },
        { name: 'Garlic', amount: '4', unit: 'cloves' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Mix herbs, garlic, and oil into paste',
        'Rub herb mixture on pork',
        'Sear in hot pan 2 minutes per side',
        'Roast at 425°F for 15-20 minutes',
        'Rest 5 minutes before slicing'
      ],
      nutritionPerServing: {
        calories: 290,
        carbs: 3,
        protein: 32,
        fat: 15,
        fiber: 1,
        sugars: 1
      }
    },
    {
      id: '18',
      name: 'Coconut Curry Vegetables',
      description: 'Flavorful vegetable curry with coconut milk',
      image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      difficulty: 'medium',
      calories: 220,
      carbs: 18,
      protein: 6,
      fat: 14,
      fiber: 8,
      glycemicLoad: 10,
      diabeticFriendly: true,
      tags: ['vegan', 'anti-inflammatory', 'warming'],
      ingredients: [
        { name: 'Mixed vegetables', amount: '4', unit: 'cups' },
        { name: 'Coconut milk', amount: '1', unit: 'can' },
        { name: 'Curry powder', amount: '2', unit: 'tbsp' },
        { name: 'Ginger', amount: '1', unit: 'tbsp' },
        { name: 'Turmeric', amount: '1', unit: 'tsp' }
      ],
      instructions: [
        'Sauté vegetables until tender',
        'Add spices and cook 1 minute',
        'Pour in coconut milk',
        'Simmer 15 minutes',
        'Adjust seasoning and serve'
      ],
      nutritionPerServing: {
        calories: 220,
        carbs: 18,
        protein: 6,
        fat: 14,
        fiber: 8,
        sugars: 10
      }
    },
    {
      id: '19',
      name: 'Baked Sweet Potato with Toppings',
      description: 'Nutrient-dense sweet potato with healthy toppings',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 5,
      cookTime: 45,
      servings: 2,
      difficulty: 'easy',
      calories: 320,
      carbs: 45,
      protein: 12,
      fat: 10,
      fiber: 8,
      glycemicLoad: 20,
      diabeticFriendly: true,
      tags: ['complex-carbs', 'beta-carotene', 'filling'],
      ingredients: [
        { name: 'Sweet potatoes', amount: '2', unit: 'medium' },
        { name: 'Black beans', amount: '1/2', unit: 'cup' },
        { name: 'Greek yogurt', amount: '1/4', unit: 'cup' },
        { name: 'Avocado', amount: '1/2', unit: 'medium' },
        { name: 'Cilantro', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Pierce sweet potatoes with fork',
        'Bake at 425°F for 40-45 minutes',
        'Cut open and fluff flesh',
        'Top with beans, yogurt, avocado',
        'Garnish with cilantro'
      ],
      nutritionPerServing: {
        calories: 320,
        carbs: 45,
        protein: 12,
        fat: 10,
        fiber: 8,
        sugars: 12
      }
    },
    {
      id: '20',
      name: 'Tuna Avocado Boats',
      description: 'Protein-rich tuna salad served in avocado halves',
      image: 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 0,
      servings: 2,
      difficulty: 'easy',
      calories: 380,
      carbs: 12,
      protein: 28,
      fat: 26,
      fiber: 10,
      glycemicLoad: 3,
      diabeticFriendly: true,
      tags: ['no-cook', 'omega-3', 'keto-friendly'],
      ingredients: [
        { name: 'Avocados', amount: '2', unit: 'large' },
        { name: 'Canned tuna', amount: '2', unit: 'cans' },
        { name: 'Celery', amount: '2', unit: 'stalks' },
        { name: 'Red onion', amount: '1/4', unit: 'small' },
        { name: 'Lemon juice', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Halve avocados and remove pits',
        'Scoop out some flesh',
        'Mix tuna with diced vegetables',
        'Add lemon juice and seasonings',
        'Fill avocado halves with tuna mixture'
      ],
      nutritionPerServing: {
        calories: 380,
        carbs: 12,
        protein: 28,
        fat: 26,
        fiber: 10,
        sugars: 2
      }
    },
    {
      id: '21',
      name: 'Quinoa Stuffed Tomatoes',
      description: 'Fresh tomatoes stuffed with protein-rich quinoa',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 20,
      cookTime: 30,
      servings: 4,
      difficulty: 'medium',
      calories: 240,
      carbs: 32,
      protein: 10,
      fat: 8,
      fiber: 6,
      glycemicLoad: 16,
      diabeticFriendly: true,
      tags: ['vegetarian', 'complete-protein', 'colorful'],
      ingredients: [
        { name: 'Large tomatoes', amount: '4', unit: 'pieces' },
        { name: 'Quinoa', amount: '1', unit: 'cup' },
        { name: 'Pine nuts', amount: '1/4', unit: 'cup' },
        { name: 'Fresh basil', amount: '1/4', unit: 'cup' },
        { name: 'Feta cheese', amount: '1/4', unit: 'cup' }
      ],
      instructions: [
        'Cut tops off tomatoes and hollow out',
        'Cook quinoa according to package directions',
        'Mix quinoa with nuts, basil, cheese',
        'Stuff tomatoes with quinoa mixture',
        'Bake at 375°F for 25-30 minutes'
      ],
      nutritionPerServing: {
        calories: 240,
        carbs: 32,
        protein: 10,
        fat: 8,
        fiber: 6,
        sugars: 8
      }
    },
    {
      id: '22',
      name: 'Cabbage Roll Soup',
      description: 'All the flavors of cabbage rolls in a comforting soup',
      image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 30,
      servings: 6,
      difficulty: 'easy',
      calories: 200,
      carbs: 12,
      protein: 18,
      fat: 8,
      fiber: 4,
      glycemicLoad: 6,
      diabeticFriendly: true,
      tags: ['comfort-food', 'one-pot', 'warming'],
      ingredients: [
        { name: 'Ground turkey', amount: '1', unit: 'lb' },
        { name: 'Cabbage', amount: '4', unit: 'cups' },
        { name: 'Diced tomatoes', amount: '1', unit: 'can' },
        { name: 'Beef broth', amount: '4', unit: 'cups' },
        { name: 'Brown rice', amount: '1/2', unit: 'cup' }
      ],
      instructions: [
        'Brown ground turkey in large pot',
        'Add cabbage and cook until wilted',
        'Add tomatoes, broth, and rice',
        'Simmer 25 minutes until rice is tender',
        'Season with herbs and serve hot'
      ],
      nutritionPerServing: {
        calories: 200,
        carbs: 12,
        protein: 18,
        fat: 8,
        fiber: 4,
        sugars: 6
      }
    },
    {
      id: '23',
      name: 'Eggplant Parmesan Stacks',
      description: 'Lighter version of classic eggplant parmesan',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 25,
      cookTime: 35,
      servings: 4,
      difficulty: 'medium',
      calories: 280,
      carbs: 18,
      protein: 16,
      fat: 18,
      fiber: 8,
      glycemicLoad: 8,
      diabeticFriendly: true,
      tags: ['vegetarian', 'baked-not-fried', 'italian'],
      ingredients: [
        { name: 'Eggplant', amount: '2', unit: 'medium' },
        { name: 'Mozzarella cheese', amount: '1', unit: 'cup' },
        { name: 'Marinara sauce', amount: '1', unit: 'cup' },
        { name: 'Parmesan cheese', amount: '1/2', unit: 'cup' },
        { name: 'Fresh basil', amount: '1/4', unit: 'cup' }
      ],
      instructions: [
        'Slice eggplant into rounds',
        'Salt and let drain 30 minutes',
        'Brush with oil and bake 20 minutes',
        'Layer with sauce and cheese',
        'Bake 15 minutes until bubbly'
      ],
      nutritionPerServing: {
        calories: 280,
        carbs: 18,
        protein: 16,
        fat: 18,
        fiber: 8,
        sugars: 12
      }
    },
    {
      id: '24',
      name: 'Shrimp and Zucchini Skewers',
      description: 'Grilled shrimp and vegetables on skewers',
      image: 'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 20,
      cookTime: 10,
      servings: 4,
      difficulty: 'easy',
      calories: 180,
      carbs: 6,
      protein: 24,
      fat: 6,
      fiber: 2,
      glycemicLoad: 2,
      diabeticFriendly: true,
      tags: ['grilled', 'low-calorie', 'quick'],
      ingredients: [
        { name: 'Large shrimp', amount: '1.5', unit: 'lbs' },
        { name: 'Zucchini', amount: '2', unit: 'medium' },
        { name: 'Bell peppers', amount: '2', unit: 'medium' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Lemon juice', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Thread shrimp and vegetables on skewers',
        'Brush with oil and lemon juice',
        'Season with herbs and spices',
        'Grill 3-4 minutes per side',
        'Serve immediately'
      ],
      nutritionPerServing: {
        calories: 180,
        carbs: 6,
        protein: 24,
        fat: 6,
        fiber: 2,
        sugars: 4
      }
    },
    {
      id: '25',
      name: 'Cauliflower Mash',
      description: 'Creamy low-carb alternative to mashed potatoes',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      difficulty: 'easy',
      calories: 80,
      carbs: 8,
      protein: 4,
      fat: 4,
      fiber: 4,
      glycemicLoad: 3,
      diabeticFriendly: true,
      tags: ['low-carb', 'side-dish', 'creamy'],
      ingredients: [
        { name: 'Cauliflower', amount: '1', unit: 'large head' },
        { name: 'Greek yogurt', amount: '1/4', unit: 'cup' },
        { name: 'Butter', amount: '1', unit: 'tbsp' },
        { name: 'Garlic', amount: '2', unit: 'cloves' },
        { name: 'Chives', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Steam cauliflower until very tender',
        'Drain well and mash',
        'Mix in yogurt and butter',
        'Add minced garlic',
        'Garnish with chives'
      ],
      nutritionPerServing: {
        calories: 80,
        carbs: 8,
        protein: 4,
        fat: 4,
        fiber: 4,
        sugars: 4
      }
    },
    {
      id: '26',
      name: 'Turkey Meatball Soup',
      description: 'Hearty soup with lean turkey meatballs',
      image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 20,
      cookTime: 25,
      servings: 6,
      difficulty: 'medium',
      calories: 220,
      carbs: 12,
      protein: 22,
      fat: 10,
      fiber: 3,
      glycemicLoad: 6,
      diabeticFriendly: true,
      tags: ['comfort-food', 'high-protein', 'warming'],
      ingredients: [
        { name: 'Ground turkey', amount: '1', unit: 'lb' },
        { name: 'Chicken broth', amount: '6', unit: 'cups' },
        { name: 'Carrots', amount: '2', unit: 'large' },
        { name: 'Celery', amount: '3', unit: 'stalks' },
        { name: 'Italian herbs', amount: '1', unit: 'tbsp' }
      ],
      instructions: [
        'Form turkey into small meatballs',
        'Brown meatballs in pot',
        'Add broth and vegetables',
        'Simmer 20 minutes',
        'Season and serve hot'
      ],
      nutritionPerServing: {
        calories: 220,
        carbs: 12,
        protein: 22,
        fat: 10,
        fiber: 3,
        sugars: 6
      }
    },
    {
      id: '27',
      name: 'Baked Portobello Mushrooms',
      description: 'Meaty mushrooms stuffed with vegetables and cheese',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      difficulty: 'easy',
      calories: 160,
      carbs: 8,
      protein: 12,
      fat: 10,
      fiber: 3,
      glycemicLoad: 3,
      diabeticFriendly: true,
      tags: ['vegetarian', 'umami', 'low-calorie'],
      ingredients: [
        { name: 'Portobello mushrooms', amount: '4', unit: 'large' },
        { name: 'Spinach', amount: '2', unit: 'cups' },
        { name: 'Goat cheese', amount: '1/4', unit: 'cup' },
        { name: 'Sun-dried tomatoes', amount: '1/4', unit: 'cup' },
        { name: 'Pine nuts', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        'Remove mushroom stems and gills',
        'Sauté spinach until wilted',
        'Mix spinach with cheese and tomatoes',
        'Fill mushroom caps with mixture',
        'Bake at 375°F for 15-20 minutes'
      ],
      nutritionPerServing: {
        calories: 160,
        carbs: 8,
        protein: 12,
        fat: 10,
        fiber: 3,
        sugars: 4
      }
    },
    {
      id: '28',
      name: 'Lemon Herb Chicken Thighs',
      description: 'Juicy chicken thighs with bright lemon flavor',
      image: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 10,
      cookTime: 35,
      servings: 4,
      difficulty: 'easy',
      calories: 320,
      carbs: 3,
      protein: 28,
      fat: 20,
      fiber: 1,
      glycemicLoad: 1,
      diabeticFriendly: true,
      tags: ['one-pan', 'citrusy', 'juicy'],
      ingredients: [
        { name: 'Chicken thighs', amount: '8', unit: 'pieces' },
        { name: 'Lemon', amount: '2', unit: 'large' },
        { name: 'Fresh herbs', amount: '1/4', unit: 'cup' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Garlic', amount: '4', unit: 'cloves' }
      ],
      instructions: [
        'Season chicken with salt and pepper',
        'Mix lemon juice, herbs, oil, garlic',
        'Marinate chicken 30 minutes',
        'Bake at 425°F for 30-35 minutes',
        'Rest 5 minutes before serving'
      ],
      nutritionPerServing: {
        calories: 320,
        carbs: 3,
        protein: 28,
        fat: 20,
        fiber: 1,
        sugars: 2
      }
    },
    {
      id: '29',
      name: 'Roasted Brussels Sprouts',
      description: 'Crispy roasted Brussels sprouts with bacon',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 10,
      cookTime: 25,
      servings: 4,
      difficulty: 'easy',
      calories: 140,
      carbs: 12,
      protein: 8,
      fat: 8,
      fiber: 6,
      glycemicLoad: 4,
      diabeticFriendly: true,
      tags: ['cruciferous', 'crispy', 'savory'],
      ingredients: [
        { name: 'Brussels sprouts', amount: '1.5', unit: 'lbs' },
        { name: 'Turkey bacon', amount: '3', unit: 'strips' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Balsamic vinegar', amount: '1', unit: 'tbsp' },
        { name: 'Red pepper flakes', amount: '1/4', unit: 'tsp' }
      ],
      instructions: [
        'Halve Brussels sprouts',
        'Toss with oil and seasonings',
        'Roast at 425°F for 20 minutes',
        'Add chopped bacon last 5 minutes',
        'Drizzle with balsamic before serving'
      ],
      nutritionPerServing: {
        calories: 140,
        carbs: 12,
        protein: 8,
        fat: 8,
        fiber: 6,
        sugars: 6
      }
    },
    {
      id: '30',
      name: 'Protein Power Bowl',
      description: 'Nutrient-dense bowl with multiple protein sources',
      image: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=400',
      prepTime: 15,
      cookTime: 10,
      servings: 2,
      difficulty: 'easy',
      calories: 420,
      carbs: 18,
      protein: 35,
      fat: 24,
      fiber: 8,
      glycemicLoad: 8,
      diabeticFriendly: true,
      tags: ['power-bowl', 'complete-meal', 'nutrient-dense'],
      ingredients: [
        { name: 'Grilled chicken', amount: '6', unit: 'oz' },
        { name: 'Hard-boiled eggs', amount: '2', unit: 'large' },
        { name: 'Quinoa', amount: '1/2', unit: 'cup' },
        { name: 'Avocado', amount: '1', unit: 'medium' },
        { name: 'Mixed greens', amount: '3', unit: 'cups' }
      ],
      instructions: [
        'Cook quinoa according to package directions',
        'Arrange greens in bowls',
        'Top with sliced chicken and eggs',
        'Add quinoa and avocado',
        'Drizzle with olive oil and lemon'
      ],
      nutritionPerServing: {
        calories: 420,
        carbs: 18,
        protein: 35,
        fat: 24,
        fiber: 8,
        sugars: 4
      }
    }
  ];

  static async searchRecipes(query: string, filters?: RecipeFilters): Promise<Recipe[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results = this.recipes;

        // Apply text search
        if (query) {
          results = results.filter(recipe => 
            recipe.name.toLowerCase().includes(query.toLowerCase()) ||
            recipe.description.toLowerCase().includes(query.toLowerCase()) ||
            recipe.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
          );
        }

        // Apply filters
        if (filters) {
          if (filters.diabeticFriendly) {
            results = results.filter(recipe => recipe.diabeticFriendly);
          }
          if (filters.maxCarbs) {
            results = results.filter(recipe => recipe.carbs <= filters.maxCarbs!);
          }
          if (filters.minProtein) {
            results = results.filter(recipe => recipe.protein >= filters.minProtein!);
          }
          if (filters.maxCalories) {
            results = results.filter(recipe => recipe.calories <= filters.maxCalories!);
          }
          if (filters.tags && filters.tags.length > 0) {
            results = results.filter(recipe => 
              filters.tags!.some(tag => recipe.tags.includes(tag))
            );
          }
          if (filters.difficulty) {
            results = results.filter(recipe => recipe.difficulty === filters.difficulty);
          }
          if (filters.maxPrepTime) {
            results = results.filter(recipe => recipe.prepTime <= filters.maxPrepTime!);
          }
        }

        resolve(results);
      }, 300);
    });
  }

  static async getRecipeById(id: string): Promise<Recipe | null> {
    return this.recipes.find(recipe => recipe.id === id) || null;
  }

  static async getRecommendedRecipes(userProfile: UserProfile): Promise<Recipe[]> {
    // Recommend recipes based on user's diabetes management goals
    let recommendations = this.recipes.filter(recipe => recipe.diabeticFriendly);

    if (userProfile.carbLimit) {
      recommendations = recommendations.filter(recipe => recipe.carbs <= userProfile.carbLimit!);
    }

    if (userProfile.preferredTags) {
      recommendations = recommendations.filter(recipe =>
        userProfile.preferredTags!.some(tag => recipe.tags.includes(tag))
      );
    }

    // Sort by glycemic load (lower is better for diabetes)
    recommendations.sort((a, b) => a.glycemicLoad - b.glycemicLoad);

    return recommendations.slice(0, 10);
  }

  static async analyzeRecipeForDiabetes(recipe: Recipe): Promise<DiabetesAnalysis> {
    return {
      glycemicImpact: this.calculateGlycemicImpact(recipe),
      insulinEstimate: this.estimateInsulinNeeded(recipe),
      bloodSugarPrediction: this.predictBloodSugarResponse(recipe),
      recommendations: this.generateDiabetesRecommendations(recipe),
      portionAdjustments: this.suggestPortionAdjustments(recipe)
    };
  }

  private static calculateGlycemicImpact(recipe: Recipe): string {
    if (recipe.glycemicLoad <= 10) return 'Low';
    if (recipe.glycemicLoad <= 20) return 'Moderate';
    return 'High';
  }

  private static estimateInsulinNeeded(recipe: Recipe): string {
    const carbRatio = 15; // Default 1:15 ratio
    const units = Math.round((recipe.carbs / carbRatio) * 10) / 10;
    return `${units} units (based on 1:15 ratio)`;
  }

  private static predictBloodSugarResponse(recipe: Recipe): string {
    const peakIncrease = recipe.glycemicLoad * 3; // Simplified calculation
    return `Expected peak increase: ${peakIncrease}mg/dL in 1-2 hours`;
  }

  private static generateDiabetesRecommendations(recipe: Recipe): string[] {
    const recommendations: string[] = [];
    
    if (recipe.glycemicLoad > 15) {
      recommendations.push('Consider pairing with protein or healthy fats to slow absorption');
    }
    if (recipe.fiber < 5) {
      recommendations.push('Add a side of vegetables for extra fiber');
    }
    if (recipe.protein < 20) {
      recommendations.push('Consider adding more protein to help stabilize blood sugar');
    }
    
    return recommendations;
  }

  private static suggestPortionAdjustments(recipe: Recipe): string[] {
    const adjustments: string[] = [];
    
    if (recipe.carbs > 30) {
      adjustments.push('Consider reducing portion size by 25% to lower carb impact');
    }
    if (recipe.calories > 400) {
      adjustments.push('This is a higher calorie meal - consider smaller portions');
    }
    
    return adjustments;
  }

  static getAllTags(): string[] {
    const allTags = new Set<string>();
    this.recipes.forEach(recipe => {
      recipe.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  glycemicLoad: number;
  diabeticFriendly: boolean;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  nutritionPerServing: NutritionInfo;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface NutritionInfo {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
}

export interface RecipeFilters {
  diabeticFriendly?: boolean;
  maxCarbs?: number;
  minProtein?: number;
  maxCalories?: number;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  maxPrepTime?: number;
}

export interface UserProfile {
  carbLimit?: number;
  preferredTags?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
}

export interface DiabetesAnalysis {
  glycemicImpact: string;
  insulinEstimate: string;
  bloodSugarPrediction: string;
  recommendations: string[];
  portionAdjustments: string[];
}