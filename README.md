# only-api

O `only-api` é um pacote projetado para facilitar a criação de rotas de maneira flexível e dinâmica, eliminando a necessidade de configurações excessivas e complexas para desenvolver uma estrutura de API REST.

A motivação para o desenvolvimento deste pacote surgiu da observação das dificuldades enfrentadas ao otimizar as endpoints de uma API REST. Tradicionalmente, ao adicionar uma nova rota, é necessário atualizar o arquivo de rotas correspondente, o que pode tornar o desenvolvimento mais lento e complexo. Este processo pode ser especialmente desafiador em arquivos de rotas extensos com muitas configurações, mesmo ao utilizar frameworks populares como o `express`. Além disso, foi identificado que a transição entre rotas dentro da mesma arquitetura pode ser complicada, aumentando a complexidade do desenvolvimento de uma API REST.

O `only-api` aborda essas questões ao fornecer uma solução que simplifica o gerenciamento de rotas, permitindo que os desenvolvedores criem e modifiquem endpoints de maneira mais eficiente e intuitiva, sem comprometer a flexibilidade e a dinamismo do sistema.

Para isso, o `only-api` utiliza um sistema de herança baseado em uma estrutura de diretórios específica, onde cada subdiretório representa uma rota de API REST. Essa abordagem permite que as rotas sejam definidas e organizadas de maneira intuitiva e modular, refletindo diretamente a estrutura de pastas do projeto. Por exemplo:

```
routes/
    users/
        index.js
        $id/
            index.ts
    posts/
        index.js
        [*]/
            index.ts
```

Neste exemplo, o diretório `users` contém um arquivo `index.js` que define a rota principal `/users`, enquanto o diretório `$id` contém um arquivo `index.ts` que define a rota `/users/:id`, o diretório `posts` contém um arquivo `index.js` que define a rota principal `/posts`, e o diretório `[*]` contém um arquivo `index.ts` que define a rota `/posts[*]`. Dessa forma, as rotas são organizadas de acordo com a estrutura de pastas, facilitando a navegação e a manutenção do código. Ou seja:

```
routes/users
routes/users/$id
routes/posts
routes/posts[*]
```

Além disso, o `only-api` elimina a necessidade de pacotes adicionais, como o `nodemon`, que são comumente usados para monitorar mudanças em arquivos e reiniciar o projeto automaticamente. O `only-api` incorpora mecanismos internos que gerenciam essas mudanças de forma eficiente, proporcionando um ambiente de desenvolvimento mais ágil e menos propenso a erros.

Essa metodologia não apenas simplifica a criação e a manutenção das rotas, mas também melhora a eficiência do desenvolvimento ao reduzir a complexidade das configurações e minimizar a sobrecarga associada ao gerenciamento manual de arquivos de rota e à reinicialização do servidor.

O `only-api` também oferece funcionalidades úteis para uso em rotas, como a capacidade de definir middlewares personalizados, validar parâmetros de entrada e saída, e personalizar o comportamento de cada rota de forma flexível e dinâmica. Esses recursos permitem que os desenvolvedores personalizem as rotas de acordo com as necessidades específicas de seus projetos, sem comprometer a simplicidade e a eficiência do sistema.

**Índice**

- [only-api](#only-api)
  - [Instalação](#instalação)
  - [Uso](#uso)
    - [`RouteResponse`](#routeresponse)
    - [`RouteRequest`](#routerequest)
  - [Funções Especiais](#funções-especiais)
    - [`corsOringin`](#corsoringin)
    - [`requiresAccess`](#requiresaccess)
    - [`getUrlOrigin`](#geturlorigin)
    - [`cacheControl`](#cachecontrol)
    - [`getCached`](#getcached)
    - [`setCache`](#setcache)

## Instalação

Para instalar o `only-api`, basta executar o seguinte comando:

```bash
npm install only-api
```

ou

```bash
yarn add only-api
```

## Uso

Para utilizar o `only-api`, basta importar o pacote para o seu projeto e inicializá-lo com as configurações desejadas. Por exemplo:

```ts
import onlyApi from 'only-api';

const app = onlyApi("./routes", {
    port: 3000,
    host: "localhost",
    middlewares: [
        (req, res, next) => {
            console.log("Middleware executado!");
            next();
        }
    ]
});
```

O `onlyApi` requer dois parâmetros: o caminho para o diretório de rotas e um objeto de configuração opcional. O diretório de rotas deve seguir a estrutura de pastas mencionada anteriormente, onde cada subdiretório representa uma rota de API REST. O objeto de configuração pode conter as seguintes propriedades:

- `port` [*number*]: a porta na qual o servidor será iniciado (padrão: `3000`)
- `host` [*string*]: o host no qual o servidor será iniciado (padrão: `localhost`)
- `middlewares` [*Function[]*]: uma lista de middlewares personalizados a serem executados antes de cada rota (padrão: `[]`)
- `maxPayloadSize` [*string*]: o tamanho máximo do payload aceito pelo servidor (padrão: `1048576`)
- `allowOrigin` [*boolean | string | RegExp | Array<boolean | string | RegExp>*]: o domínio permitido para acessar o servidor (padrão: `*`)
- `cors` [*CorsOptions*]: as opções de CORS a serem aplicadas ao servidor (padrão: `{}`)
- `trustProxy` [*boolean*]: se o servidor deve confiar no cabeçalho `X-Forwarded-For` (padrão: `false`)

Após a inicialização do `only-api`, o servidor será iniciado automaticamente e as rotas serão carregadas dinamicamente com base na estrutura de pastas fornecida. Qualquer alteração nos arquivos de rota será detectada automaticamente e refletida no servidor sem a necessidade de reinicialização manual.

Cada arquivo de rota deve exportar uma série de funções que definem o comportamento da rota, de acordo com a necessidade. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.text("GET /users");
};

export const post = (req) => {
    return RouteResponse.text("POST /users");
};

export const put = (req) => {
    return RouteResponse.text("PUT /users");
};

export const delete = (req) => {
    return RouteResponse.text("DELETE /users");
};
```

### `RouteResponse`

No exemplo anterior, observe que cada função exportada deve corresponder a um método HTTP específico (por exemplo, `get`, `post`, `put`, `delete`, `all`) e retornar um objeto `RouteResponse` que define a resposta da rota. O objeto `RouteResponse` possui os seguintes métodos estáticos disponíveis:

- `json` [*RouteResponse*]: retorna uma resposta JSON com o corpo fornecido
- `text` [*RouteResponse*]: retorna uma resposta de texto com o corpo fornecido
- `html` [*RouteResponse*]: retorna uma resposta HTML com o corpo fornecido
- `buffer` [*RouteResponse*]: retorna uma resposta de buffer com o corpo fornecido
- `stream` [*RouteResponse*]: retorna uma resposta de stream com o corpo fornecido
- `send` [*RouteResponse*]: envia uma resposta com o corpo fornecido e os cabeçalhos fornecidos
- `error` [*RouteResponse*]: retorna uma resposta de erro com o código de status fornecido e a mensagem de erro fornecida
- `status` [*RouteResponse*]: define o código de status da resposta

Exemplos:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.json({ message: "GET /users" });
    // return RouteResponse.send({ message: "GET /users" });
    // return RouteResponse.send({ message: "GET /users" }, "application/json");
    // return RouteResponse.error(404, "Not Found");
    // return RouteResponse.status(200).json({ message: "GET /users" });
    // return RouteResponse.status(200, "Ok").json({ message: "GET /users" });
};

export const post = (req) => {
    return RouteResponse.text("POST /users");
    // return RouteResponse.text("POST /users", "text/plain");
};

export const put = (req) => {
    return RouteResponse.html("<h1>PUT /users</h1>");
    // return RouteResponse.stream(fs.createReadStream("file.txt"));
    // return RouteResponse.stream(fs.createReadStream("file.txt"), "application/octet-stream");
    // return RouteResponse.stream((start, end) => chunk.slice(start, end));
};

export const delete = (req) => {
    return RouteResponse.buffer(Buffer.from("DELETE /users"));
    // return RouteResponse.buffer(Buffer.from("DELETE /users"), "application/octet-stream");
};
```

O único retorno aceitável é um objeto `RouteResponse` ou uma `Promise` que resolve em um objeto `RouteResponse`. Qualquer outro tipo de retorno será tratado como um erro e resultará em uma resposta de erro com o código de status `500` e a mensagem de erro correspondente ou uma resposta da propriedade `send` em `RouteResponse` que seja capaz de resolver o retorno.

Em algumas propriedades no `RouteResponse`, é possível passar um segundo parâmetro opcional que define o tipo de conteúdo da resposta. Por exemplo, `RouteResponse.text("GET /users", "text/plain")` define o tipo de conteúdo da resposta como `text/plain`. Ele pode ser uma string ou um objeto que define o tipo de conteúdo da resposta. Exemplos:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.send("GET /users", "text/plain");
};

export const post = (req) => {
    return RouteResponse.send("POST /users", {
        type: "text/plain",
        length: 10, 
        attachment: true
    });
};

export const put = (req) => {
    return RouteResponse.send("<h1>PUT /users</h1>", { 
        type: "text/plain", 
        attachment: "file.txt", 
        security: "no-referrer"
    });
};

export const delete = (req) => {
    return RouteResponse.send(Buffer.from("DELETE /users"), {
        type: "text/plain", 
        disposition: "attachment; filename=\"file.txt\"", 
        security: { 
            policy: "no-referrer", 
            reportOnly: true
        }
    });
};
```

### `RouteRequest`

O Request passado para cada função é bastante limitado, isso pensando em segurança e simplicidade. Para acessar os dados do Request, basta acessar o primeiro parâmetro da função. Para acessar os dados do Response, basta retornar um objeto `RouteResponse`, como mostrado anteriormente. A estrutura do Request é a seguinte:

```ts
interface RouteRequest<
	B = any,
	P extends string = string,
	Q extends string = string,
	C extends Record<string, any> = {
		[key: string]: any;
	},
> {
	method: "GET" | "POST" | "PUT" | "DELETE";
	headers: Headers;
	body: B;
	params: {
		[key in P]: string;
	};
	query: Partial<{
		[key in Q]: string;
	}>;
	cache: SimpleCache<C>;
    files: FileInfo[];
	file?: FileInfo;
}
```

- `method` [*string*]: o método HTTP da requisição
- `headers` [*Headers*]: os cabeçalhos da requisição
- `body` [*B*]: o corpo da requisição
- `params` [*Record<string, string>*]: os parâmetros da rota
- `query` [*Record<string, string>*]: os parâmetros da query
- `cache` [*SimpleCache<C>*]: um cache simples para armazenar dados temporários na rota atual, desrrespeitando os curingas

Exemplo:

```ts
// routes/users/$id/index.ts
import { RouteRequest, RouteResponse } from 'only-api';

export const get = (req: RouteRequest<{}, "id", "date"|"q">) => {
    const { id } = req.params;
    const { date, q } = req.query;
    return RouteResponse.json({ message: `GET /users/${id}` });
};
```

## Funções Especiais

O `only-api` oferece algumas funções especiais que podem ser utilizadas para personalizar o comportamento das rotas de forma flexível e dinâmica. Essas funções podem ser exportadas em qualquer arquivo de rota (somente nas rotas) e deverão ser chamadas entro da função de rota desejada. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, corsOringin } from 'only-api';

export const get = (req) => {
    corsOringin("http://example.com");

    return RouteResponse.json({ message: "GET /users" });
};
```

As funções especiais disponíveis são:

### `corsOringin`

A função `corsOringin` permite definir o domínio permitido para acessar a rota atual. Ele responde um `throws` caso o domínio não seja permitido. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, corsOringin } from 'only-api';

export const get = (req) => {
    corsOringin("http://example.com");

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Configura o cabeçalho CORS e ao mesmo tempo valida a origem
 * @param origin Origem permitida
 * @param exposeHeaders Cabeçalhos expostos
 * @throws Se a origem não for permitida
 */
const corsOringin: (origin: string | string[], exposeHeaders?: string | string[]) => void;
```

### `requiresAccess`

A função `requiresAccess` permite definir um middleware de autenticação para a rota atual. Ele responde um `throws` caso o usuário não esteja autenticado. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, requiresAccess } from 'only-api';

export const get = (req) => {
    requiresAccess({ admin: "12345" });

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Requer acesso para acessar uma rota
 * @param users Usuários e senhas permitidos
 * @throws Se o usuário não tiver acesso
 */
const requiresAccess: (users: Record<string, string | string[]>) => void
```

### `getUrlOrigin`

A função `getUrlOrigin` permite obter a origem da URL atual, respeitando o curinga. Por exemplo:

```ts
// routes/users/$id/index.ts
import { RouteResponse, getUrlOrigin } from 'only-api';

export const get = (req) => {
    const origin = getUrlOrigin(); // routes/users/admin

    return RouteResponse.json({ origin });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Obter a origem da URL
 * @returns A origem da URL
 */
const getUrlOrigin: () => string;
```

### `cacheControl`

A função `cacheControl` permite personalizar o armazenamento em cache da resposta da rota atual. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, cacheControl } from 'only-api';

export const get = (req) => {
    cacheControl(15);

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Armazenar em cache a resposta de uma rota
 * @param duration A duração do cache em segundos
 * @param id Um identificador único para a rota
 * @throws Se a rota já estiver armazenada em cache; expressão regular "__cache_control_response__{id}"
 */
const cacheControl: (duration: number, id?: string) => void;
```

### `getCached`

A função `getCached` permite obter a resposta armazenada em cache da rota atual. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, getCached } from 'only-api';

export const get = (req) => {
    const cached = getCached();

    if (cached) return RouteResponse.json(cached);

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Obter a resposta armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
const getCached: <T = any>(id?: string) => T | undefined;
```

### `setCache`

A função `setCache` permite armazenar, de forma personalizada, um valor em cache. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, setCache, getCached } from 'only-api';

export const get = (req) => {
    const cached = getCached("message");

    if (cached) RouteResponse.json({ message: cached });

    setCache("message", "GET /users");

    return RouteResponse.json({ message: getCached("message") });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Armazenar uma resposta em cache
 * @param id Um identificador único para a rota
 * @param value A resposta a ser armazenada
 * @param duration A duração do cache em segundos, padrão 15 segundos
 */
const setCache: <T = any>(id: string, value: T, duration?: number) => void;
```