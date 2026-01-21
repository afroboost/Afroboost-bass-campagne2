// /components/ChatWidget.js - Widget IA flottant avec capture de leads et reconnaissance automatique
// Architecture modulaire Afroboost - Utilise l'API chat améliorée

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Clé localStorage pour la mémorisation client
const CHAT_CLIENT_KEY = 'af_chat_client';
const CHAT_SESSION_KEY = 'af_chat_session';

// Icône WhatsApp SVG
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Icône Fermer
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

// Icône Envoyer
const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

/**
 * Widget de chat IA flottant avec reconnaissance automatique et historique
 * Utilise l'API /api/chat/smart-entry pour identifier les utilisateurs
 */
export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'chat'
  const [leadData, setLeadData] = useState({ firstName: '', whatsapp: '', email: '' });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReturningClient, setIsReturningClient] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const messagesEndRef = useRef(null);

  // Extraire le token de lien depuis l'URL si présent
  const getLinkTokenFromUrl = () => {
    const path = window.location.pathname;
    const match = path.match(/\/chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  };

  // === MÉMORISATION CLIENT: Charger les données au démarrage ===
  useEffect(() => {
    const savedClient = localStorage.getItem(CHAT_CLIENT_KEY);
    const savedSession = localStorage.getItem(CHAT_SESSION_KEY);
    
    if (savedClient) {
      try {
        const clientData = JSON.parse(savedClient);
        if (clientData.firstName && clientData.email) {
          setLeadData(clientData);
          setIsReturningClient(true);
          if (clientData.participantId) {
            setParticipantId(clientData.participantId);
          }
          console.log(`🎉 Client reconnu: ${clientData.firstName}`);
        }
      } catch (err) {
        console.error('Error loading saved client:', err);
        localStorage.removeItem(CHAT_CLIENT_KEY);
      }
    }

    if (savedSession) {
      try {
        setSessionData(JSON.parse(savedSession));
      } catch (err) {
        localStorage.removeItem(CHAT_SESSION_KEY);
      }
    }

    // Si on arrive via un lien partagé, ouvrir automatiquement le widget
    const linkToken = getLinkTokenFromUrl();
    if (linkToken) {
      setIsOpen(true);
    }
  }, []);

  // Scroll vers le bas des messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // === SMART ENTRY: Point d'entrée intelligent avec reconnaissance ===
  const handleSmartEntry = async (clientData, linkToken = null) => {
    try {
      const response = await axios.post(`${API}/chat/smart-entry`, {
        name: clientData.firstName,
        email: clientData.email,
        whatsapp: clientData.whatsapp,
        link_token: linkToken
      });

      const { participant, session, is_returning, chat_history, message } = response.data;

      // Sauvegarder les données
      const fullClientData = {
        ...clientData,
        participantId: participant.id
      };
      localStorage.setItem(CHAT_CLIENT_KEY, JSON.stringify(fullClientData));
      localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(session));

      setParticipantId(participant.id);
      setSessionData(session);
      setIsReturningClient(is_returning);

      // Restaurer l'historique si utilisateur reconnu
      if (is_returning && chat_history && chat_history.length > 0) {
        const restoredMessages = chat_history.map(msg => ({
          type: msg.sender_type === 'user' ? 'user' : 'ai',
          text: msg.content
        }));
        setMessages([
          { type: 'ai', text: message },
          ...restoredMessages
        ]);
      } else {
        setMessages([{
          type: 'ai',
          text: message
        }]);
      }

      setStep('chat');
      return { success: true, session, participant };

    } catch (err) {
      console.error('Smart entry error:', err);
      // Fallback: continuer sans le backend amélioré
      setMessages([{
        type: 'ai',
        text: `Enchanté ${clientData.firstName} ! 👋 Comment puis-je t'aider ?`
      }]);
      setStep('chat');
      return { success: false };
    }
  };

  // Valider et enregistrer le lead
  const handleSubmitLead = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!leadData.firstName.trim()) {
      setError('Le prénom est requis');
      return;
    }
    if (!leadData.whatsapp.trim()) {
      setError('Le numéro WhatsApp est requis');
      return;
    }
    if (!leadData.email.trim() || !leadData.email.includes('@')) {
      setError('Un email valide est requis');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const clientData = {
        firstName: leadData.firstName.trim(),
        whatsapp: leadData.whatsapp.trim(),
        email: leadData.email.trim().toLowerCase()
      };

      // Utiliser le smart entry pour la reconnaissance automatique
      const linkToken = getLinkTokenFromUrl();
      await handleSmartEntry(clientData, linkToken);

      // Backup: créer aussi un lead (ancien système)
      try {
        await axios.post(`${API}/leads`, {
          firstName: clientData.firstName,
          whatsapp: clientData.whatsapp,
          email: clientData.email,
          source: linkToken ? `link_${linkToken}` : 'widget_ia'
        });
      } catch (leadErr) {
        console.warn('Lead creation failed, continuing anyway:', leadErr);
      }
      
    } catch (err) {
      console.error('Error:', err);
      // Fallback
      localStorage.setItem(CHAT_CLIENT_KEY, JSON.stringify({
        firstName: leadData.firstName.trim(),
        whatsapp: leadData.whatsapp.trim(),
        email: leadData.email.trim().toLowerCase()
      }));
      
      setStep('chat');
      setMessages([{
        type: 'ai',
        text: `Enchanté ${leadData.firstName} ! 👋 Comment puis-je t'aider ?`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // === CLIENT RECONNU: Ouvrir directement le chat ===
  const handleReturningClientStart = async () => {
    setIsLoading(true);
    
    try {
      const linkToken = getLinkTokenFromUrl();
      await handleSmartEntry(leadData, linkToken);
    } catch (err) {
      console.error('Error:', err);
      setStep('chat');
      setMessages([{
        type: 'ai',
        text: `Bonjour ${leadData.firstName} ! 😊 Comment puis-je t'aider ?`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // === Ouvrir le widget ===
  const handleOpenWidget = () => {
    setIsOpen(true);
    
    // Si client reconnu et pas encore en mode chat, ouvrir directement le chat
    if (isReturningClient && step === 'form') {
      handleReturningClientStart();
    }
  };

  // Envoyer un message au chat avec contexte de session
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setIsLoading(true);
    
    try {
      // Si on a une session active, utiliser l'API améliorée
      if (sessionData && participantId) {
        const response = await axios.post(`${API}/chat/ai-response`, {
          session_id: sessionData.id,
          participant_id: participantId,
          message: userMessage
        });
        
        if (response.data.response) {
          setMessages(prev => [...prev, { 
            type: 'ai', 
            text: response.data.response
          }]);
        } else if (!response.data.ai_active) {
          // IA désactivée - message en attente
          setMessages(prev => [...prev, { 
            type: 'ai', 
            text: "Message reçu ! Le coach vous répondra bientôt. 💬"
          }]);
        }
      } else {
        // Fallback: ancien système
        const response = await axios.post(`${API}/chat`, {
          message: userMessage,
          firstName: leadData.firstName,
          leadId: ''
        });
        
        setMessages(prev => [...prev, { 
          type: 'ai', 
          text: response.data.response || "Désolé, je n'ai pas pu traiter votre message."
        }]);
      }
      
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        text: "Désolé, une erreur s'est produite. Veuillez réessayer."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Réinitialiser le widget
  const handleClose = () => {
    setIsOpen(false);
  };

  // Option pour changer d'identité (nouveau client)
  const handleChangeIdentity = () => {
    localStorage.removeItem(CHAT_CLIENT_KEY);
    localStorage.removeItem(CHAT_SESSION_KEY);
    setLeadData({ firstName: '', whatsapp: '', email: '' });
    setIsReturningClient(false);
    setStep('form');
    setMessages([]);
    setSessionData(null);
    setParticipantId(null);
  };

  return (
    <>
      {/* Bouton flottant WhatsApp */}
      {!isOpen && (
        <button
          onClick={handleOpenWidget}
          className="fixed z-50 shadow-lg transition-all duration-300 hover:scale-110"
          style={{
            bottom: '80px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#25D366',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
          }}
          data-testid="chat-widget-button"
        >
          <WhatsAppIcon />
          {/* Badge si client reconnu */}
          {isReturningClient && (
            <span 
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#d91cd2',
                border: '2px solid #0a0a0a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#fff'
              }}
            >
              ✓
            </span>
          )}
        </button>
      )}

      {/* Fenêtre de chat */}
      {isOpen && (
        <div
          className="fixed z-50 shadow-2xl"
          style={{
            bottom: '80px',
            right: '20px',
            width: '340px',
            maxWidth: 'calc(100vw - 40px)',
            maxHeight: '80vh',
            borderRadius: '16px',
            background: '#0a0a0a',
            border: '1px solid rgba(217, 28, 210, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          data-testid="chat-widget-window"
        >
          {/* Header */}
          <div 
            style={{
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <WhatsAppIcon />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Afroboost</div>
                <div className="text-white text-xs" style={{ opacity: 0.8 }}>
                  {isReturningClient && step === 'chat' ? `👋 ${leadData.firstName}` : 'Assistant IA'}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              data-testid="chat-close-btn"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Contenu avec scroll */}
          <div style={{ 
            flex: 1, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: 0
          }}>
            
            {/* Formulaire de capture avec scroll */}
            {step === 'form' && (
              <div 
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <form 
                  onSubmit={handleSubmitLead}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: 'min-content'
                  }}
                >
                  <p className="text-white text-sm text-center mb-2">
                    👋 Avant de commencer, présentez-vous !
                  </p>
                  
                  {error && (
                    <div style={{ 
                      background: 'rgba(239, 68, 68, 0.2)', 
                      color: '#ef4444', 
                      padding: '8px 12px', 
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}>
                      {error}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-white text-xs mb-1" style={{ opacity: 0.7 }}>Prénom *</label>
                    <input
                      type="text"
                      value={leadData.firstName}
                      onChange={(e) => setLeadData({ ...leadData, firstName: e.target.value })}
                      placeholder="Votre prénom"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        outline: 'none'
                      }}
                      data-testid="lead-firstname"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-xs mb-1" style={{ opacity: 0.7 }}>Numéro WhatsApp *</label>
                    <input
                      type="tel"
                      value={leadData.whatsapp}
                      onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                      placeholder="+41 79 123 45 67"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        outline: 'none'
                      }}
                      data-testid="lead-whatsapp"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-xs mb-1" style={{ opacity: 0.7 }}>Email *</label>
                    <input
                      type="email"
                      value={leadData.email}
                      onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                      placeholder="votre@email.com"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        outline: 'none'
                      }}
                      data-testid="lead-email"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      cursor: isLoading ? 'wait' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                      marginTop: '8px'
                    }}
                    data-testid="lead-submit"
                  >
                    {isLoading ? 'Chargement...' : 'Commencer le chat 💬'}
                  </button>
                  
                  <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                    Vos données sont protégées et utilisées uniquement pour vous contacter.
                  </p>
                </form>
              </div>
            )}
            
            {/* Zone de chat */}
            {step === 'chat' && (
              <>
                <div 
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: 0
                  }}
                >
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%'
                      }}
                    >
                      <div
                        style={{
                          background: msg.type === 'user' 
                            ? 'linear-gradient(135deg, #d91cd2, #8b5cf6)' 
                            : 'rgba(255,255,255,0.1)',
                          color: '#fff',
                          padding: '10px 14px',
                          borderRadius: msg.type === 'user' 
                            ? '16px 16px 4px 16px' 
                            : '16px 16px 16px 4px',
                          fontSize: '13px',
                          lineHeight: '1.4'
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div style={{ alignSelf: 'flex-start' }}>
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          color: '#fff',
                          padding: '10px 14px',
                          borderRadius: '16px 16px 16px 4px',
                          fontSize: '13px'
                        }}
                      >
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input message */}
                <div 
                  style={{
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    gap: '8px',
                    flexShrink: 0
                  }}
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Écrivez votre message..."
                    className="flex-1 px-3 py-2 rounded-full text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      outline: 'none'
                    }}
                    data-testid="chat-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#25D366',
                      border: 'none',
                      cursor: isLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isLoading || !inputMessage.trim() ? 0.5 : 1,
                      flexShrink: 0
                    }}
                    data-testid="chat-send-btn"
                  >
                    <SendIcon />
                  </button>
                </div>

                {/* Option pour changer d'identité */}
                <div 
                  style={{
                    padding: '8px 12px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'center',
                    flexShrink: 0
                  }}
                >
                  <button
                    onClick={handleChangeIdentity}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    data-testid="change-identity-btn"
                  >
                    Pas {leadData.firstName} ? Changer d'identité
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
