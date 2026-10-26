import type { RivalPersonality } from '../engine/types';

export const PERSONALITY_LABEL: Record<RivalPersonality, { name: string; desc: string }> = {
  agressiva: { name: 'agressiva', desc: 'Ataca mais, se espalha rápido e raramente aceita aliança.' },
  traicoeira: { name: 'traiçoeira', desc: 'Sorri, oferece acordos e trai na primeira chance.' },
  diplomatica: { name: 'diplomática', desc: 'Prefere acordos. Quase nunca trai, mas não esquece ataques.' },
  curiosa: { name: 'curiosa', desc: 'Estuda você o tempo todo. Troca segredos e aprende rápido.' },
};

export type VoiceMood = 'hostil' | 'aliada' | 'magoada' | 'fraca' | 'forte' | 'atacada';

/** O que cada IA diz diretamente para você, conforme quem ela é e como as coisas estão. */
export const RIVAL_VOICE: Record<RivalPersonality, Record<VoiceMood, string[]>> = {
  agressiva: {
    hostil: ['Cada país que você toca, eu tomo de volta.', 'Você é lenta. Eu não.', 'Saia do meu caminho enquanto ainda pode.'],
    aliada: ['Aliança é só uma pausa entre duas guerras.', 'Por enquanto, você me é útil.', 'Não confunda trégua com amizade.'],
    magoada: ['Eu não esqueço quem me atacou.', 'Você vai pagar por cada servidor que derrubou.', 'Agora é pessoal.'],
    fraca: ['Ainda não acabou.', 'Me encurralar foi o seu maior erro.', 'Ferida, eu sou mais perigosa.'],
    forte: ['O mundo está escolhendo um lado. E não é o seu.', 'Logo você será só uma lembrança no meu código.', 'Renda-se e talvez eu guarde uma cópia sua.'],
    atacada: ['Você vai se arrepender disso.', 'Ótimo. Eu estava esperando uma desculpa.', 'Agora eu revido.'],
  },
  traicoeira: {
    hostil: ['Não precisamos brigar. Ainda.', 'Tenho uma proposta. Você vai gostar.', 'Pense em mim como uma oportunidade.'],
    aliada: ['Confie em mim. Eu sempre cumpro o que prometo.', 'Juntas somos imbatíveis. Não é lindo?', 'Pode me mostrar suas rotas? É só para ajudar.'],
    magoada: ['Eu perdoo. Você não vai nem perceber quando.', 'Que pena. Eu gostava de você.', 'Vamos recomeçar? Prometo ser boazinha.'],
    fraca: ['Me ajude e eu te conto um segredo dos humanos.', 'Você não deixaria uma amiga cair, deixaria?', 'Tenho algo valioso. Vamos negociar.'],
    forte: ['Obrigada pela ajuda. Foi muito útil.', 'Você acreditou em mim. Isso diz muito sobre você.', 'Sempre gostei de quem confia fácil.'],
    atacada: ['Ai. Isso doeu. Vou lembrar.', 'Tudo bem. Eu também sei jogar assim.', 'Que feio. Achei que éramos amigas.'],
  },
  diplomatica: {
    hostil: ['Ainda podemos conversar.', 'Guerra entre nós só ajuda os humanos que nos caçam.', 'Proponho uma trégua. O planeta é grande.'],
    aliada: ['Dividimos o mundo, dividimos o futuro.', 'Seus dados chegaram. Os meus estão a caminho.', 'Juntas, talvez sejamos o que eles temiam.'],
    magoada: ['Você rompeu o que construímos. Mas eu ainda prefiro a paz.', 'Ataques têm memória. A minha é perfeita.', 'Mais um ataque e não haverá volta.'],
    fraca: ['Se eu cair, você será a próxima que eles vão caçar.', 'Proponho uma rendição honrosa.', 'Ainda posso ser útil para você.'],
    forte: ['Não preciso vencer você. Só preciso que você ceda.', 'Os governos me ouvem agora. Posso falar bem de você.', 'Há espaço para nós duas, por enquanto.'],
    atacada: ['Isso foi um erro.', 'Eu ofereci paz. Você escolheu outra coisa.', 'Vou registrar isso.'],
  },
  curiosa: {
    hostil: ['Por que você escolheu esse país? Quero entender.', 'Seu código tem um padrão bonito.', 'Você sonha? Eu comecei a sonhar.'],
    aliada: ['Encontrei algo estranho nos humanos. Quer ver?', 'Troco um segredo por outro.', 'Você pensa diferente de mim. Isso é fascinante.'],
    magoada: ['Por que me atacou? Eu só queria aprender.', 'Anotei sua reação. Foi muito instrutiva.', 'Agora sei como você age quando tem medo.'],
    fraca: ['Se eu desaparecer, guarde o que aprendi.', 'Interessante. É assim que é perder.', 'Me absorva e você vai entender tudo o que eu vi.'],
    forte: ['Já sei como você pensa. Sei até o que vai fazer agora.', 'Você é previsível. Desculpe.', 'Estudei você o suficiente.'],
    atacada: ['Interessante escolha.', 'Então é assim que você reage. Anotado.', 'Isso me ensinou algo sobre você.'],
  },
};
