import { Platform } from 'react-native';

export interface VoiceInputResult {
  success: boolean;
  text?: string;
  error?: string;
}

export class VoiceInputService {
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    return true;
  }

  static async startRecording(): Promise<VoiceInputResult> {
    try {
      if (Platform.OS === 'web') {
        return await this.startWebRecording();
      }

      return {
        success: false,
        error: 'Voice input requires expo-speech module for native platforms',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private static async startWebRecording(): Promise<VoiceInputResult> {
    return new Promise((resolve) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        resolve({
          success: false,
          error: 'Speech recognition not supported in this browser',
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve({
          success: true,
          text: transcript,
        });
      };

      recognition.onerror = (event: any) => {
        resolve({
          success: false,
          error: event.error,
        });
      };

      recognition.onend = () => {
        recognition.stop();
      };

      recognition.start();

      setTimeout(() => {
        recognition.stop();
        resolve({
          success: false,
          error: 'Timeout: No speech detected',
        });
      }, 10000);
    });
  }

  static async parseFoodDescription(text: string): Promise<{
    foodName: string;
    portion?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }> {
    const lowerText = text.toLowerCase();

    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined;
    if (lowerText.includes('breakfast')) mealType = 'breakfast';
    else if (lowerText.includes('lunch')) mealType = 'lunch';
    else if (lowerText.includes('dinner')) mealType = 'dinner';
    else if (lowerText.includes('snack')) mealType = 'snack';

    const portionKeywords = ['small', 'medium', 'large', 'cup', 'bowl', 'plate', 'serving', 'piece', 'slice'];
    let portion: string | undefined;

    for (const keyword of portionKeywords) {
      if (lowerText.includes(keyword)) {
        const index = lowerText.indexOf(keyword);
        const words = lowerText.substring(Math.max(0, index - 10), index + keyword.length + 10).split(' ');
        portion = words.join(' ').trim();
        break;
      }
    }

    const cleanText = text
      .replace(/\b(breakfast|lunch|dinner|snack)\b/gi, '')
      .replace(/\b(log|logged|record|add)\b/gi, '')
      .trim();

    return {
      foodName: cleanText || text,
      portion,
      mealType,
    };
  }

  static getSampleCommands(): string[] {
    return [
      'Log breakfast oatmeal with berries',
      'Add a large apple for snack',
      'Record dinner chicken breast with rice',
      'Log lunch turkey sandwich',
      'Add medium banana',
      'Record snack almonds',
    ];
  }
}
