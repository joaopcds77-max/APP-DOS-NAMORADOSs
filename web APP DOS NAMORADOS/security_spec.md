# Especificação de Segurança Firestore (Security Spec)

## Invariantes de Dados
1. Uma `surpresa` deve conter dados válidos de ambos os parceiros, uma música tema e história do casal.
2. A leitura é restrita a operações `get` específicas com base no conhecimento do ID exclusivo do documento (link único). Consultas de listagem (`list`) são estritamente proibidas para evitar varredura de dados públicos.
3. Chaves sensíveis ou atributos fantasmas são rejeitados de imediato por meio de validações estritas de tamanho e chaves obrigatórias.

## Payloads de Teste (The Dirty Dozen)
As seguintes tentativas de gravação serão recusadas pelas regras do Firestore:
1. ID de documento malicioso composto por strings gigantescas ou caracteres ilegais.
2. Criação sem o campo obrigatório `partner1`.
3. Adição de propriedade fantasma (`isPremium: true`).
4. História do casal excedendo o limite de caracteres (mais de 5000 caract.).
5. Redirecionamento ilegal de dados de foto que não sejam strings ou arrays de string.
6. Sobrescrita de campos imutáveis que não sejam a declaração gerada por IA (`declaracao_ia`).
