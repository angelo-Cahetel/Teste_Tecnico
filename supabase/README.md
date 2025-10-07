# Documentação Técnica: Backend de E-commerce com Supabase
Autor: Angelo Cahetel Mendes de Souza
Data: 06 de Outubro de 2025
Projeto: Teste Técnico - Desenvolvedor Júnior/Estagiário Supabase
---

## 1. Objetivo
Este documento detalha a arquitetura, as decisões de design e a lógica de implementação do backend para um sistema de e-commerce construído sobre a plataforma Supabase. O objetivo foi criar uma solução segura, escalável e eficiente, utilizando os principais recursos do Supabase, como o banco de dados PostgreSQL, Row-Level Security (RLS), Funções de Banco de Dados e Edge Functions.

---

## 2. Arquitetura e Decisões de Design
A arquitetura foi centrada em aproveitar ao máximo os recursos nativos do Supabase para reduzir a complexidade e garantir a segurança e o desempenho.

- **Banco de Dados (PostgreSQL)**: O PostgreSQL foi utilizado como a fundação para o armazenamento de dados. A modelagem visou a normalização para evitar redundância, com otimizações de desempenho onde necessário.
- **Segurança (Row-Level Security - RLS)**: A RLS foi a principal estratégia de segurança, garantindo que os usuários só possam acessar os dados que lhes pertencem. A política padrão é "negar tudo", e o acesso é concedido apenas por meio de políticas explícitas, o que constitui uma prática de segurança robusta.
- **Lógica de Negócios no Banco de Dados**: Processos críticos, como o cálculo do total de um pedido, foram implementados diretamente no banco de dados usando funções e gatilhos (triggers). Esta decisão centraliza a lógica de negócios, garante a consistência dos dados e melhora o desempenho.
- **Edge Functions (Deno)**: Foram utilizadas para orquestrar tarefas assíncronas e integrações com serviços de terceiros (como envio de e-mails), mantendo as chaves de API e a lógica sensível no lado do servidor.

--- 

## 3. Lógica de Implementação Detalhada
### 3.1. Estrutura das Tabelas
Foram criadas quatro tabelas principais para estruturar os dados do e-commerce:
- `clientes`:
    - **Decisão**: A tabela foi projetada para ter uma relação de um-para-um com a tabela `auth.users` do Supabase. O `id` do cliente é uma chave primária e, ao mesmo tempo, uma chave estrangeira que referencia `auth.users(id)`.
    - **Lógica**: Esta abordagem aproveita o sistema de autenticação nativo do Supabase. Ela separa os dados públicos do perfil (`nome_completo`, `endereco`) dos dados de autenticação privados, o que é uma boa prática de segurança.

- `produtos`:
    -  **Decisão**: Uma tabela padrão para armazenar informações dos produtos, com um ID do tipo `BIGINT` auto-incremental.
    - **Lógica**: O tipo `BIGINT` foi escolhido para suportar um grande volume de produtos no futuro.

- `pedidos`:
    - **Decisão**: Contém uma coluna `total`, que é calculada e armazenada no momento da transação, e uma coluna `status` para rastrear o ciclo de vida do pedido.
    - **Lógica**: Armazenar o `total` diretamente na tabela é uma otimização de desempenho. Evita a necessidade de recalcular a soma dos itens toda vez que uma lista de pedidos é consultada, tornando as leituras muito mais rápidas.

- `itens_pedido`:
    - **Decisão**: Tabela de junção para a relação muitos-para-muitos entre `pedidos` e `produtos`. Uma coluna `preco_unitario` foi incluída.
    - **Lógica**: Esta é a modelagem padrão para este tipo de relação. A inclusão da coluna `preco_unitario` é crucial: ela armazena o preço do produto no momento exato da compra. Isso garante a integridade histórica dos pedidos, mesmo que o preço do produto na tabela `produtos` seja alterado no futuro.

### 3.2. Implementação da Segurança (RLS)

- **Decisão**: Habilitar RLS em todas as tabelas com dados de usuários e definir políticas explícitas para cada uma.
- **Lógica**:
    - `clientes` e `pedidos`: As políticas garantem que um usuário autenticado só pode visualizar ou modificar seus próprios dados. Isso é feito comparando o ID do usuário logado (`auth.uid()`) com a chave estrangeira `cliente_id` na tabela `pedidos` ou o `id` na tabela `clientes`.
    - `produtos`: A política permite que qualquer usuário autenticado (`auth.role() = 'authenticated'`) possa visualizar os produtos, pois são considerados dados públicos dentro do contexto da loja.

### 3.3. Automações no Banco de Dados
- Cálculo de Total do Pedido (Função e Trigger):
    - **Decisão**: Implementar o cálculo do total do pedido através de uma função (`recalcular_total_pedido`) acionada por um gatilho (trigger) na tabela `itens_pedido`.
    - **Lógica**: Esta abordagem é superior a cálculos no lado do cliente ou via API. Ela garante que o `total` do pedido seja sempre consistente e preciso, pois a atualização é atômica e ocorre diretamente no banco de dados, que é a fonte única da verdade. Isso simplifica o código do frontend e aumenta a confiabilidade do sistema.
- **View** `detalhes_pedidos`:
    - **Decisão**: Criar uma `VIEW` para desnormalizar e agregar dados de pedidos em uma única consulta.
    - **Lógica**: A view `detalhes_pedidos` simplifica drasticamente as consultas do lado do cliente. Em vez de fazer múltiplas chamadas para buscar o pedido, o cliente e os itens, uma única `SELECT` na view retorna um objeto completo e aninhado. Isso reduz a latência da rede e melhora o desempenho da aplicação.

### 3.4. Edge Functions
- `confirmacao-pedido`:
    - **Decisão**: Isolar a lógica de envio de e-mails em uma Edge Function.
    - **Lógica**: Chaves de API de serviços externos (como Resend para e-mails) nunca devem ser expostas no lado do cliente. Uma Edge Function fornece um ambiente de servidor seguro para armazenar esses segredos e executar a lógica de integração. A função é projetada para ser acionada (por exemplo, por um webhook de pagamento) e realizar sua tarefa de forma independente.
- `exportar-csv`:
    - **Decisão**: Utilizar uma Edge Function para gerar e servir um arquivo CSV de um pedido.
    - **Lógica**: A geração de arquivos é uma tarefa clássica do lado do servidor. A função consulta o banco de dados (respeitando as políticas de RLS do usuário que a invocou), formata os dados para o padrão CSV e retorna a resposta com os cabeçalhos HTTP corretos (`Content-Type` e `Content-Disposition`) para que o navegador inicie o download do arquivo.

## 4. Conclusão
A solução implementada atende a todos os requisitos do teste técnico, resultando em um backend de e-commerce funcional, seguro e performático. As decisões tomadas priorizaram o uso dos recursos idiomáticos da plataforma Supabase, o que leva a um código mais limpo, seguro e de fácil manutenção.