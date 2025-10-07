import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Usaremos um serviço de e-mail como Resend, SendGrid, etc.
// As chaves de API devem ser armazenadas como secrets no Supabase.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_API_URL = "https://api.resend.com/emails";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Dados do pedido viriam no corpo da requisição
    const { emailCliente, nomeCliente, pedidoId } = await req.json();

    const emailHtml = `
      <h1>Olá, ${nomeCliente}!</h1>
      <p>Seu pedido #${pedidoId} foi confirmado com sucesso.</p>
      <p>Obrigado por comprar conosco!</p>
    `;

    // Lógica para enviar o e-mail (exemplo com Resend)
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Loja <nao-responda@sua-loja.com>',
        to: [emailCliente],
        subject: `Confirmação do Pedido #${pedidoId}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      throw new Error("Falha ao enviar e-mail de confirmação.");
    }

    return new Response(JSON.stringify({ message: "E-mail de confirmação enviado." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});