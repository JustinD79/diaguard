# NutriTrack - AI-Powered Nutrition Awareness

A comprehensive nutrition tracking application that helps you understand your food choices through AI-powered analysis.

## Overview

NutriTrack is a nutrition awareness tool designed to help you log meals, track macronutrients, and gain insights into your eating habits. Using advanced AI vision technology, the app can analyze food images and provide estimated nutritional information for educational purposes.

**Important:** This app is for educational and nutritional awareness purposes only. It does not provide medical advice, diagnosis, or treatment. Always consult with healthcare professionals for personalized dietary guidance.

## Features

### Core Features
- **AI Food Recognition**: Snap a photo to get estimated nutritional information
- **Barcode Scanning**: Quick nutrition lookup for packaged foods
- **Manual Food Logging**: Comprehensive food database with detailed nutrition data
- **Macro Tracking**: Monitor carbs, protein, fat, and calories
- **Weight Tracking**: Log and visualize weight trends over time
- **Exercise Logging**: Track workouts and activity levels
- **Hydration Tracking**: Monitor daily water intake
- **Custom Recipes**: Create and save your favorite recipes with nutrition calculations

### Premium Features
- **Advanced AI Analysis**: Enhanced food recognition accuracy
- **Family Profiles**: Track nutrition for multiple family members
- **Detailed Reports**: Weekly and monthly nutrition summaries
- **Export Data**: Download your nutrition logs in various formats
- **Priority Support**: Get help when you need it

### Additional Features
- **Meal Reminders**: Stay consistent with nutrition logging
- **Streaks & Achievements**: Track your logging consistency
- **Emergency Contacts**: Quick access to important contacts
- **Dark Mode**: Comfortable viewing in any lighting
- **Multi-language Support**: Available in multiple languages

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Database**: Supabase
- **AI Vision**: Claude Vision API / OpenAI GPT-4 Vision
- **Nutrition Data**: USDA FoodData Central, Nutritionix
- **Payment Processing**: Stripe

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd diabetes-care-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Configure your `.env` file with required API keys:
- Supabase credentials
- AI API keys (Anthropic or OpenAI)
- Nutrition API keys (USDA, Nutritionix)
- Stripe keys (for subscriptions)

5. Start the development server
```bash
npm start
```

### Running the App

- **Web**: `npm run web`
- **iOS**: `npm run ios` (requires macOS and Xcode)
- **Android**: `npm run android` (requires Android Studio)

## Project Structure

```
├── app/                    # App screens and routes (Expo Router)
├── components/            # Reusable UI components
├── contexts/              # React Context providers
├── services/              # Business logic and API services
├── lib/                   # Utilities and configurations
├── assets/                # Images and static resources
└── supabase/             # Database migrations and functions
```

## Legal & Privacy

### Medical Disclaimer
This application is NOT a medical device and does NOT provide medical advice. All nutritional estimates are approximate and for educational purposes only. Do not use this app for medical diagnosis or treatment decisions. Always consult qualified healthcare professionals for personalized medical advice.

### Data Privacy
- All user data is encrypted and stored securely
- We do not sell or share personal information
- Users have full control over their data
- GDPR and CCPA compliant

See our [Privacy Policy](./app/(tabs)/privacy-policy.tsx) and [Terms of Service](./app/(tabs)/terms-of-service.tsx) for details.

## FDA Compliance

This app is positioned as a **general wellness application** focused on nutrition awareness and does not claim to:
- Diagnose, treat, cure, or prevent any disease
- Provide medical advice or recommendations
- Replace professional medical care
- Calculate insulin doses or medication schedules
- Monitor or manage medical conditions

The app helps users track nutrition for general wellness purposes, similar to other fitness and nutrition tracking applications.

## Contributing

We welcome contributions! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Add tests if applicable
5. Submit a pull request

## Support

For support inquiries:
- Email: support@nutritrack.app
- Documentation: [docs.nutritrack.app](https://docs.nutritrack.app)
- Issues: GitHub Issues

## License

Copyright © 2024 NutriTrack. All rights reserved.

## Acknowledgments

- USDA FoodData Central for nutrition database
- Anthropic and OpenAI for AI vision capabilities
- Supabase for backend infrastructure
- Expo team for excellent mobile development tools
