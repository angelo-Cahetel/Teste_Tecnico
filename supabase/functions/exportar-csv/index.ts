import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Função auxiliar para converter JSON para CSV
function toCsv(data: any[]): string {
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Cabeçalho
    ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
  ];
  return csvRows.join('\n');
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { pedido_id } = await req.json();
    if (!pedido_id) {
      throw new Error("O 'pedido_id' é obrigatório.");
    }
    
    // Consulta os itens de um pedido específico
    // NOTA: A RLS garante que o usuário só pode consultar seus próprios pedidos.
    const { data, error } = await supabaseClient
      .from('itens_pedido')
      .select(`
        quantidade,
        preco_unitario,
        produtos ( nome, descricao )
      `)
      .eq('pedido_id', pedido_id);

    if (error) throw error;
    if (!data || data.length === 0) {
      return new Response("Pedido não encontrado ou sem itens.", { status: 404 });
    }
    
    // Formata os dados para o CSV
    const formattedData = data.map(item => ({
        produto_nome: item.produtos.nome,
        produto_descricao: item.produtos.descricao,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.quantidade * item.preco_unitario
    }));

    const csvContent = toCsv(formattedData);
    
    // Retorna o arquivo CSV
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="pedido_${pedido_id}.csv"`,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});