/**
 * Multi-language translations for DiaGuard
 * Supports: English, Spanish, French, German, Chinese
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh';

export type TranslationKeys =
  | 'common.app_name'
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'common.cancel'
  | 'common.save'
  | 'common.delete'
  | 'common.edit'
  | 'common.close'
  | 'common.confirm'
  | 'scanner.title'
  | 'scanner.scan_food'
  | 'scanner.analyzing'
  | 'scanner.take_photo'
  | 'scanner.retake'
  | 'scanner.log_meal'
  | 'nutrition.carbs'
  | 'nutrition.protein'
  | 'nutrition.fat'
  | 'nutrition.calories'
  | 'nutrition.fiber'
  | 'nutrition.total_carbs'
  | 'nutrition.net_carbs'
  | 'meals.breakfast'
  | 'meals.lunch'
  | 'meals.dinner'
  | 'meals.snack'
  | 'meals.meal_log'
  | 'meals.no_meals'
  | 'reports.title'
  | 'reports.generate'
  | 'reports.export_pdf'
  | 'reports.date_range'
  | 'patterns.title'
  | 'patterns.daily_average'
  | 'patterns.weekly_trend'
  | 'patterns.carb_distribution'
  | 'family.title'
  | 'family.add_member'
  | 'family.create_family'
  | 'family.family_name'
  | 'family.member_name'
  | 'family.relationship'
  | 'profile.title'
  | 'profile.settings'
  | 'profile.language'
  | 'profile.notifications'
  | 'auth.login'
  | 'auth.signup'
  | 'auth.logout'
  | 'auth.email'
  | 'auth.password'
  | 'auth.forgot_password'
  | 'disclaimer.medical'
  | 'disclaimer.educational_only';

interface TranslationObject {
  common: {
    app_name: string;
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    confirm: string;
  };
  scanner: {
    title: string;
    scan_food: string;
    analyzing: string;
    take_photo: string;
    retake: string;
    log_meal: string;
  };
  nutrition: {
    carbs: string;
    protein: string;
    fat: string;
    calories: string;
    fiber: string;
    total_carbs: string;
    net_carbs: string;
  };
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
    meal_log: string;
    no_meals: string;
  };
  reports: {
    title: string;
    generate: string;
    export_pdf: string;
    date_range: string;
  };
  patterns: {
    title: string;
    daily_average: string;
    weekly_trend: string;
    carb_distribution: string;
  };
  family: {
    title: string;
    add_member: string;
    create_family: string;
    family_name: string;
    member_name: string;
    relationship: string;
  };
  profile: {
    title: string;
    settings: string;
    language: string;
    notifications: string;
  };
  auth: {
    login: string;
    signup: string;
    logout: string;
    email: string;
    password: string;
    forgot_password: string;
  };
  disclaimer: {
    medical: string;
    educational_only: string;
  };
}

export const translations: Record<Language, TranslationObject> = {
  en: {
    common: {
      app_name: 'DiaGuard',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      confirm: 'Confirm',
    },
    scanner: {
      title: 'Food Scanner',
      scan_food: 'Scan Food',
      analyzing: 'Analyzing...',
      take_photo: 'Take Photo',
      retake: 'Retake',
      log_meal: 'Log Meal',
    },
    nutrition: {
      carbs: 'Carbs',
      protein: 'Protein',
      fat: 'Fat',
      calories: 'Calories',
      fiber: 'Fiber',
      total_carbs: 'Total Carbs',
      net_carbs: 'Net Carbs',
    },
    meals: {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
      meal_log: 'Meal Log',
      no_meals: 'No meals logged yet',
    },
    reports: {
      title: 'Reports',
      generate: 'Generate Report',
      export_pdf: 'Export PDF',
      date_range: 'Date Range',
    },
    patterns: {
      title: 'Patterns',
      daily_average: 'Daily Average',
      weekly_trend: 'Weekly Trend',
      carb_distribution: 'Carb Distribution',
    },
    family: {
      title: 'Family',
      add_member: 'Add Member',
      create_family: 'Create Family',
      family_name: 'Family Name',
      member_name: 'Member Name',
      relationship: 'Relationship',
    },
    profile: {
      title: 'Profile',
      settings: 'Settings',
      language: 'Language',
      notifications: 'Notifications',
    },
    auth: {
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      forgot_password: 'Forgot Password',
    },
    disclaimer: {
      medical: 'This app provides educational information only and does not constitute medical advice.',
      educational_only: 'For educational purposes only. Consult your healthcare provider.',
    },
  },

  es: {
    common: {
      app_name: 'DiaGuard',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      confirm: 'Confirmar',
    },
    scanner: {
      title: 'Escáner de Alimentos',
      scan_food: 'Escanear Comida',
      analyzing: 'Analizando...',
      take_photo: 'Tomar Foto',
      retake: 'Volver a Tomar',
      log_meal: 'Registrar Comida',
    },
    nutrition: {
      carbs: 'Carbohidratos',
      protein: 'Proteína',
      fat: 'Grasa',
      calories: 'Calorías',
      fiber: 'Fibra',
      total_carbs: 'Carbohidratos Totales',
      net_carbs: 'Carbohidratos Netos',
    },
    meals: {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Merienda',
      meal_log: 'Registro de Comidas',
      no_meals: 'No hay comidas registradas',
    },
    reports: {
      title: 'Informes',
      generate: 'Generar Informe',
      export_pdf: 'Exportar PDF',
      date_range: 'Rango de Fechas',
    },
    patterns: {
      title: 'Patrones',
      daily_average: 'Promedio Diario',
      weekly_trend: 'Tendencia Semanal',
      carb_distribution: 'Distribución de Carbohidratos',
    },
    family: {
      title: 'Familia',
      add_member: 'Agregar Miembro',
      create_family: 'Crear Familia',
      family_name: 'Nombre de Familia',
      member_name: 'Nombre del Miembro',
      relationship: 'Relación',
    },
    profile: {
      title: 'Perfil',
      settings: 'Configuración',
      language: 'Idioma',
      notifications: 'Notificaciones',
    },
    auth: {
      login: 'Iniciar Sesión',
      signup: 'Registrarse',
      logout: 'Cerrar Sesión',
      email: 'Correo Electrónico',
      password: 'Contraseña',
      forgot_password: 'Olvidé mi Contraseña',
    },
    disclaimer: {
      medical: 'Esta aplicación proporciona información educativa únicamente y no constituye asesoramiento médico.',
      educational_only: 'Solo con fines educativos. Consulte a su proveedor de atención médica.',
    },
  },

  fr: {
    common: {
      app_name: 'DiaGuard',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      confirm: 'Confirmer',
    },
    scanner: {
      title: 'Scanner d\'Aliments',
      scan_food: 'Scanner la Nourriture',
      analyzing: 'Analyse en cours...',
      take_photo: 'Prendre une Photo',
      retake: 'Reprendre',
      log_meal: 'Enregistrer le Repas',
    },
    nutrition: {
      carbs: 'Glucides',
      protein: 'Protéines',
      fat: 'Graisses',
      calories: 'Calories',
      fiber: 'Fibres',
      total_carbs: 'Glucides Totaux',
      net_carbs: 'Glucides Nets',
    },
    meals: {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner',
      dinner: 'Dîner',
      snack: 'Collation',
      meal_log: 'Journal des Repas',
      no_meals: 'Aucun repas enregistré',
    },
    reports: {
      title: 'Rapports',
      generate: 'Générer un Rapport',
      export_pdf: 'Exporter en PDF',
      date_range: 'Plage de Dates',
    },
    patterns: {
      title: 'Tendances',
      daily_average: 'Moyenne Quotidienne',
      weekly_trend: 'Tendance Hebdomadaire',
      carb_distribution: 'Distribution des Glucides',
    },
    family: {
      title: 'Famille',
      add_member: 'Ajouter un Membre',
      create_family: 'Créer une Famille',
      family_name: 'Nom de Famille',
      member_name: 'Nom du Membre',
      relationship: 'Relation',
    },
    profile: {
      title: 'Profil',
      settings: 'Paramètres',
      language: 'Langue',
      notifications: 'Notifications',
    },
    auth: {
      login: 'Connexion',
      signup: 'S\'inscrire',
      logout: 'Déconnexion',
      email: 'E-mail',
      password: 'Mot de passe',
      forgot_password: 'Mot de passe oublié',
    },
    disclaimer: {
      medical: 'Cette application fournit des informations éducatives uniquement et ne constitue pas un avis médical.',
      educational_only: 'À des fins éducatives uniquement. Consultez votre professionnel de santé.',
    },
  },

  de: {
    common: {
      app_name: 'DiaGuard',
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      save: 'Speichern',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      close: 'Schließen',
      confirm: 'Bestätigen',
    },
    scanner: {
      title: 'Lebensmittel-Scanner',
      scan_food: 'Essen Scannen',
      analyzing: 'Analysieren...',
      take_photo: 'Foto Machen',
      retake: 'Wiederholen',
      log_meal: 'Mahlzeit Protokollieren',
    },
    nutrition: {
      carbs: 'Kohlenhydrate',
      protein: 'Protein',
      fat: 'Fett',
      calories: 'Kalorien',
      fiber: 'Ballaststoffe',
      total_carbs: 'Gesamtkohlenhydrate',
      net_carbs: 'Netto-Kohlenhydrate',
    },
    meals: {
      breakfast: 'Frühstück',
      lunch: 'Mittagessen',
      dinner: 'Abendessen',
      snack: 'Snack',
      meal_log: 'Mahlzeitenprotokoll',
      no_meals: 'Keine Mahlzeiten protokolliert',
    },
    reports: {
      title: 'Berichte',
      generate: 'Bericht Erstellen',
      export_pdf: 'PDF Exportieren',
      date_range: 'Datumsbereich',
    },
    patterns: {
      title: 'Muster',
      daily_average: 'Tagesdurchschnitt',
      weekly_trend: 'Wochentrend',
      carb_distribution: 'Kohlenhydratverteilung',
    },
    family: {
      title: 'Familie',
      add_member: 'Mitglied Hinzufügen',
      create_family: 'Familie Erstellen',
      family_name: 'Familienname',
      member_name: 'Mitgliedsname',
      relationship: 'Beziehung',
    },
    profile: {
      title: 'Profil',
      settings: 'Einstellungen',
      language: 'Sprache',
      notifications: 'Benachrichtigungen',
    },
    auth: {
      login: 'Anmelden',
      signup: 'Registrieren',
      logout: 'Abmelden',
      email: 'E-Mail',
      password: 'Passwort',
      forgot_password: 'Passwort Vergessen',
    },
    disclaimer: {
      medical: 'Diese App bietet nur Bildungsinformationen und stellt keine medizinische Beratung dar.',
      educational_only: 'Nur zu Bildungszwecken. Konsultieren Sie Ihren Arzt.',
    },
  },

  zh: {
    common: {
      app_name: 'DiaGuard',
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      confirm: '确认',
    },
    scanner: {
      title: '食物扫描仪',
      scan_food: '扫描食物',
      analyzing: '分析中...',
      take_photo: '拍照',
      retake: '重拍',
      log_meal: '记录餐食',
    },
    nutrition: {
      carbs: '碳水化合物',
      protein: '蛋白质',
      fat: '脂肪',
      calories: '卡路里',
      fiber: '纤维',
      total_carbs: '总碳水化合物',
      net_carbs: '净碳水化合物',
    },
    meals: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '小吃',
      meal_log: '餐食日志',
      no_meals: '尚未记录餐食',
    },
    reports: {
      title: '报告',
      generate: '生成报告',
      export_pdf: '导出PDF',
      date_range: '日期范围',
    },
    patterns: {
      title: '模式',
      daily_average: '日均值',
      weekly_trend: '周趋势',
      carb_distribution: '碳水化合物分布',
    },
    family: {
      title: '家庭',
      add_member: '添加成员',
      create_family: '创建家庭',
      family_name: '家庭名称',
      member_name: '成员姓名',
      relationship: '关系',
    },
    profile: {
      title: '个人资料',
      settings: '设置',
      language: '语言',
      notifications: '通知',
    },
    auth: {
      login: '登录',
      signup: '注册',
      logout: '退出',
      email: '电子邮件',
      password: '密码',
      forgot_password: '忘记密码',
    },
    disclaimer: {
      medical: '此应用仅提供教育信息，不构成医疗建议。',
      educational_only: '仅供教育目的。请咨询您的医疗保健提供者。',
    },
  },
};
