import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConversation, ChatMessage } from '../../hooks/useConversation';

const AI_RESPONSES: Record<string, string> = {
  default: 'Gracias por tu mensaje. El administrador te responderá pronto. Mientras tanto, puedo ayudarte con preguntas básicas sobre acuarística.',
  betta: 'Los Betta splendens son peces que prefieren estar solos. Los machos no deben coexistir en el mismo tanque. Necesitan al menos 20L de agua a 24-30°C con pH entre 6.0-7.5.',
  ph: 'Para ajustar el pH de forma segura: usa turba o ramas de arándano para bajar el pH, y coral o conchas para subirlo. Cambia el pH gradualmente (max 0.2 por día) para no estresar a los peces.',
  temperatura: 'La temperatura ideal depende de cada especie. Generalmente los peces tropicales prefieren 24-28°C. Usa un termostato de calidad y revisa la temperatura diariamente.',
  compatibilidad: 'Para verificar la compatibilidad de tus peces, ve a la sección "Mis Acuarios", crea un acuario y añade los peces que deseas. El sistema calculará automáticamente la compatibilidad.',
  parametros: 'Los parámetros más importantes son: pH (6.5-7.5 para mayoría de tropicales), temperatura (24-28°C), amoniaco (0 ppm), nitrito (0 ppm) y nitrato (<40 ppm). Mide semanalmente.',
  alimentacion: 'Alimenta tus peces 1-2 veces al día con la cantidad que consuman en 2-3 minutos. El exceso de comida contamina el agua y puede causar problemas de salud.',
};

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('betta') || lower.includes('betta')) return AI_RESPONSES.betta;
  if (lower.includes('ph') || lower.includes('acidez') || lower.includes('alcalin')) return AI_RESPONSES.ph;
  if (lower.includes('temperatura') || lower.includes('calor') || lower.includes('frio')) return AI_RESPONSES.temperatura;
  if (lower.includes('compatib') || lower.includes('junto') || lower.includes('conviv')) return AI_RESPONSES.compatibilidad;
  if (lower.includes('parametro') || lower.includes('amoniaco') || lower.includes('nitrito')) return AI_RESPONSES.parametros;
  if (lower.includes('comer') || lower.includes('aliment') || lower.includes('comida')) return AI_RESPONSES.alimentacion;
  return AI_RESPONSES.default;
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const isAI = message.sender === 'ai';
  const isAdmin = message.sender === 'admin';

  return (
    <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
      {!isOwn && (
        <View style={[styles.avatar, isAI && styles.avatarAI, isAdmin && styles.avatarAdmin]}>
          <Ionicons
            name={isAI ? 'sparkles' : 'shield'}
            size={14}
            color={isAI ? COLORS.accent : COLORS.warning}
          />
        </View>
      )}
      <View style={[
        styles.bubble,
        isOwn ? styles.bubbleOwn : isAI ? styles.bubbleAI : styles.bubbleAdmin,
      ]}>
        {!isOwn && (
          <Text style={[styles.senderLabel, isAI && { color: COLORS.accent }, isAdmin && { color: COLORS.warning }]}>
            {isAI ? 'Asistente IA' : 'Administrador'}
          </Text>
        )}
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{message.content}</Text>
        <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
          {new Date(message.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { messages, sendMessage: persistMessage, addAIMessage } = useConversation();
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cancel pending timers on unmount to avoid setState-after-unmount warnings
  useEffect(() => () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userInput = input.trim();
    setInput('');
    setLoading(true);

    await persistMessage(userInput);
    timersRef.current.push(setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50));

    // Generate local AI response
    timersRef.current.push(setTimeout(() => {
      addAIMessage(getAIResponse(userInput));
      setLoading(false);
      timersRef.current.push(setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100));
    }, 1200));
  };

  const QUICK_QUESTIONS = [
    '¿Cómo ajusto el pH?',
    '¿Betta con guppies?',
    '¿Parámetros ideales?',
    '¿Cuánto alimentar?',
  ];

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        {/* Online indicator */}
        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Asistente IA disponible • Admin puede unirse</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.sender === 'user'} />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.typingText}>Asistente está escribiendo...</Text>
          </View>
        )}

        {/* Quick questions */}
        {messages.length <= 2 && (
          <View style={styles.quickRow}>
            {QUICK_QUESTIONS.map(q => (
              <TouchableOpacity
                key={q}
                style={styles.quickChip}
                onPress={() => { setInput(q); }}
              >
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  messageList: { padding: SPACING.md, paddingBottom: SPACING.lg },
  messageRow: { flexDirection: 'row', marginBottom: SPACING.md, alignItems: 'flex-end' },
  messageRowOwn: { justifyContent: 'flex-end' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  avatarAI: { backgroundColor: COLORS.accent + '33' },
  avatarAdmin: { backgroundColor: COLORS.warning + '33' },
  bubble: {
    maxWidth: '80%', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border,
  },
  bubbleOwn: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  bubbleAI: { backgroundColor: COLORS.backgroundCard, borderColor: COLORS.accent + '44' },
  bubbleAdmin: { backgroundColor: COLORS.backgroundCard, borderColor: COLORS.warning + '44' },
  senderLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 3, fontFamily: FONTS.sansBd },
  messageText: { color: COLORS.text, fontSize: 14, lineHeight: 20, fontFamily: FONTS.sans },
  messageTextOwn: { color: COLORS.white },
  messageTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: 'right', fontFamily: FONTS.sans },
  messageTimeOwn: { color: 'rgba(255,255,255,0.6)' },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  typingText: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  quickChip: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.primary + '66',
  },
  quickChipText: { color: COLORS.primary, fontSize: 12, fontFamily: FONTS.sans },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  input: {
    flex: 1, color: COLORS.text, fontSize: 14, maxHeight: 100,
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
    fontFamily: FONTS.sans,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: COLORS.backgroundLight },
});
