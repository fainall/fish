import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type Tab = 'privacy' | 'terms';

export default function LegalScreen({ navigation, route }: any) {
  const initialTab = route?.params?.tab ?? 'privacy';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacy' && styles.tabOn]}
          onPress={() => setTab('privacy')}
        >
          <Ionicons name={tab === 'privacy' ? 'shield-checkmark' : 'shield-checkmark-outline'} size={16}
            color={tab === 'privacy' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextOn]}>Privacidad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'terms' && styles.tabOn]}
          onPress={() => setTab('terms')}
        >
          <Ionicons name={tab === 'terms' ? 'document-text' : 'document-text-outline'} size={16}
            color={tab === 'terms' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'terms' && styles.tabTextOn]}>Términos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}
function Paragraph({ children }: { children: string }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function PrivacyContent() {
  return (
    <View>
      <Text style={styles.lastUpdated}>Última actualización: 10 de junio de 2026</Text>

      <SectionTitle>1. Información que Recopilamos</SectionTitle>
      <Paragraph>Aquaria recopila la siguiente información cuando utilizas nuestra aplicación:</Paragraph>
      <Paragraph>• Información de cuenta: correo electrónico y nombre al registrarte.</Paragraph>
      <Paragraph>• Datos de acuarios: información sobre tus acuarios, peces, parámetros del agua y tareas que registras voluntariamente.</Paragraph>
      <Paragraph>• Fotos: imágenes que subes a tu galería, perfil o a un reporte de soporte, almacenadas de forma segura.</Paragraph>
      <Paragraph>• Contenido de la comunidad: publicaciones y comentarios que decides compartir públicamente con otros usuarios.</Paragraph>
      <Paragraph>• Mensajes del asistente y de soporte: el texto que escribes en el chat de asistencia y en los reportes de errores.</Paragraph>
      <Paragraph>• Datos de uso y diagnóstico: qué pantallas visitas (analítica interna) e informes de errores para mejorar la app.</Paragraph>

      <SectionTitle>2. Cómo Usamos tu Información</SectionTitle>
      <Paragraph>Utilizamos tu información para:</Paragraph>
      <Paragraph>• Proveer y personalizar el servicio de gestión de acuarios.</Paragraph>
      <Paragraph>• Generar alertas y recomendaciones basadas en tus datos.</Paragraph>
      <Paragraph>• Responder tus preguntas mediante el asistente con inteligencia artificial.</Paragraph>
      <Paragraph>• Enviar notificaciones sobre tareas de mantenimiento y correos de tu cuenta (p. ej. recuperación de contraseña).</Paragraph>
      <Paragraph>• Mejorar la aplicación, medir su uso y corregir errores.</Paragraph>

      <SectionTitle>3. Asistente con Inteligencia Artificial</SectionTitle>
      <Paragraph>Aquaria incluye un asistente que usa inteligencia artificial de un proveedor externo (OpenAI) para responder tus preguntas sobre acuarismo.</Paragraph>
      <Paragraph>Cuando usas el chat, el texto de tu pregunta (y los mensajes recientes de esa conversación) se envían a los servidores de OpenAI, ubicados en Estados Unidos, para generar la respuesta. No enviamos tu correo, contraseña ni otros datos personales al proveedor de IA.</Paragraph>
      <Paragraph>El asistente ofrece información orientativa y puede contener errores; no sustituye el consejo de un profesional.</Paragraph>

      <SectionTitle>4. Servicios de Terceros</SectionTitle>
      <Paragraph>No vendemos tu información. La compartimos únicamente con proveedores que nos permiten operar la app, y solo lo necesario para su función:</Paragraph>
      <Paragraph>• Supabase: base de datos, autenticación y almacenamiento de tus datos y fotos (encriptados en tránsito y en reposo).</Paragraph>
      <Paragraph>• OpenAI: procesa el texto que envías al asistente de IA (ver sección 3).</Paragraph>
      <Paragraph>• Sentry: recibe informes de errores para diagnosticar fallos; puede incluir tu identificador de cuenta.</Paragraph>
      <Paragraph>• Proveedor de correo: envía los correos de tu cuenta (verificación, recuperación de contraseña).</Paragraph>

      <SectionTitle>5. Almacenamiento y Seguridad</SectionTitle>
      <Paragraph>Tus datos se almacenan de forma segura con encriptación en tránsito y en reposo. Las contraseñas se guardan con hash (bcrypt) y nunca en texto plano. El acceso a tus datos está restringido mediante políticas de seguridad por usuario.</Paragraph>

      <SectionTitle>6. Tus Derechos</SectionTitle>
      <Paragraph>Tienes derecho a:</Paragraph>
      <Paragraph>• Acceder a tus datos personales y corregir los inexactos.</Paragraph>
      <Paragraph>• Eliminar tu cuenta y todos los datos asociados. Puedes solicitarlo escribiéndonos al correo de contacto y tu cuenta será eliminada de forma permanente.</Paragraph>
      <Paragraph>• Cambiar tu contraseña desde Perfil → Cuenta → Cambiar contraseña.</Paragraph>

      <SectionTitle>7. Cookies y Seguimiento</SectionTitle>
      <Paragraph>Aquaria no utiliza cookies de seguimiento ni rastreo publicitario, ni comparte tus datos con anunciantes. Solo usamos almacenamiento local del dispositivo para mantener tu sesión y analítica interna de uso.</Paragraph>

      <SectionTitle>8. Menores de Edad</SectionTitle>
      <Paragraph>Aquaria no está dirigida a menores de 13 años. No recopilamos intencionalmente información de menores. Si eres padre o tutor y crees que tu hijo nos ha proporcionado datos, contáctanos para eliminarlos.</Paragraph>

      <SectionTitle>9. Contacto</SectionTitle>
      <Paragraph>Para consultas sobre privacidad o para eliminar tu cuenta, escríbenos a: soporte@severeynfish.cl</Paragraph>
    </View>
  );
}

function TermsContent() {
  return (
    <View>
      <Text style={styles.lastUpdated}>Última actualización: 10 de junio de 2026</Text>

      <SectionTitle>1. Aceptación de los Términos</SectionTitle>
      <Paragraph>Al descargar, instalar o utilizar Aquaria, aceptas estos términos de uso. Si no estás de acuerdo, no utilices la aplicación.</Paragraph>

      <SectionTitle>2. Descripción del Servicio</SectionTitle>
      <Paragraph>Aquaria es una herramienta de gestión para acuaristas que permite registrar y monitorear acuarios, peces, parámetros del agua, tareas de mantenimiento y más. Incluye un asistente con inteligencia artificial que responde consultas sobre acuarismo. Las recomendaciones y las respuestas del asistente son orientativas, pueden contener errores y no sustituyen el consejo de un profesional.</Paragraph>

      <SectionTitle>3. Registro de Cuenta</SectionTitle>
      <Paragraph>Para usar Aquaria necesitas crear una cuenta con un correo electrónico válido. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas con tu cuenta.</Paragraph>

      <SectionTitle>4. Uso Aceptable</SectionTitle>
      <Paragraph>Te comprometes a:</Paragraph>
      <Paragraph>• Usar la app solo para fines legítimos de gestión acuarista.</Paragraph>
      <Paragraph>• No intentar acceder a cuentas de otros usuarios.</Paragraph>
      <Paragraph>• No realizar ingeniería inversa de la aplicación.</Paragraph>
      <Paragraph>• No usar la app para distribuir contenido ofensivo o ilegal.</Paragraph>

      <SectionTitle>5. Propiedad Intelectual</SectionTitle>
      <Paragraph>Todo el contenido de Aquaria, incluyendo diseño, código, base de datos de especies y textos, está protegido por derechos de autor. La base de datos de 119+ especies fue compilada con información de fuentes públicas y expertos en acuarismo.</Paragraph>

      <SectionTitle>6. Limitación de Responsabilidad</SectionTitle>
      <Paragraph>Aquaria se proporciona "tal cual". Las alertas, recomendaciones de compatibilidad y diagnósticos de enfermedades son orientativos. No nos responsabilizamos por daños derivados del uso de la información proporcionada por la aplicación, incluyendo pero no limitándose a la pérdida de peces o daños al equipo.</Paragraph>

      <SectionTitle>7. Disponibilidad del Servicio</SectionTitle>
      <Paragraph>Nos esforzamos por mantener la app disponible, pero no garantizamos un funcionamiento ininterrumpido. Podemos realizar mantenimiento o actualizaciones que requieran tiempo de inactividad temporal.</Paragraph>

      <SectionTitle>8. Modificaciones</SectionTitle>
      <Paragraph>Nos reservamos el derecho de modificar estos términos. Los cambios significativos se notificarán a través de la aplicación. El uso continuado después de la notificación constituye aceptación de los nuevos términos.</Paragraph>

      <SectionTitle>9. Contacto</SectionTitle>
      <Paragraph>Para consultas sobre estos términos: soporte@severeynfish.cl</Paragraph>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  tabs: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6, borderRadius: BORDER_RADIUS.lg,
  },
  tabOn: { backgroundColor: COLORS.primary + '14' },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sans },
  tabTextOn: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  content: { padding: SPACING.lg, paddingBottom: 80 },
  lastUpdated: {
    fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans,
    fontStyle: 'italic', marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    fontFamily: FONTS.sansBd, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  paragraph: {
    fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.sans,
    lineHeight: 22, marginBottom: SPACING.xs,
  },
});
