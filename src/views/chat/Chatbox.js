import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"

const shell = {
  border: "1px solid #dee2e6",
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
  backgroundColor: "#f8f9fa",
  color: "#212529",
}

const title = {
  margin: "0 0 10px 0",
  fontSize: "1rem",
  fontWeight: 600,
  color: "#212529",
}

const scrollArea = {
  maxHeight: 220,
  overflowY: "auto",
  padding: 8,
  backgroundColor: "#ffffff",
  borderRadius: 6,
  border: "1px solid #dee2e6",
}

const bubbleBase = {
  padding: "8px 12px",
  borderRadius: 10,
  display: "inline-block",
  maxWidth: "85%",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: "0.9rem",
  lineHeight: 1.4,
}

const bubbleMine = {
  ...bubbleBase,
  backgroundColor: "#0d6efd",
  color: "#ffffff",
}

const bubbleOther = {
  ...bubbleBase,
  backgroundColor: "#e9ecef",
  color: "#212529",
}

const inputRow = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  alignItems: "center",
}

const inputStyle = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ced4da",
  backgroundColor: "#ffffff",
  color: "#212529",
  fontSize: "0.9rem",
}

const buttonStyle = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  backgroundColor: "#0d6efd",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 500,
}

export default function ChatBox({ bookingId, userId, otherUserId }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })

    setMessages(data || [])
  }

  useEffect(() => {
    if (bookingId) {
      fetchMessages()
    }
  }, [bookingId])

  const sendMessage = async () => {
    if (!text.trim()) return

    const { error } = await supabase.from("chat_messages").insert({
      booking_id: bookingId,
      sender_id: userId,
      receiver_id: otherUserId,
      content: text,
    })

    if (!error) {
      setText("")
      fetchMessages()
    } else {
      console.error(error)
    }
  }

  return (
    <div style={shell}>
      <h5 style={title}>Chat</h5>

      <div style={scrollArea}>
        {messages.length === 0 ? (
          <p style={{ margin: 0, color: "#6c757d", fontSize: "0.875rem" }}>
            Aún no hay mensajes. Escribe abajo para comenzar.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId
            return (
              <div
                key={m.id}
                style={{
                  textAlign: mine ? "right" : "left",
                  marginBottom: 8,
                }}
              >
                <span style={mine ? bubbleMine : bubbleOther}>{m.content}</span>
              </div>
            )
          })
        )}
      </div>

      <div style={inputRow}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={inputStyle}
        />
        <button type="button" onClick={sendMessage} style={buttonStyle}>
          Enviar
        </button>
      </div>
    </div>
  )
}
