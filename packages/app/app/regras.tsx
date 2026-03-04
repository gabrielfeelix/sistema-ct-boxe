import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function RegrasScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            {/* Header Sérious & Dark */}
            <View className="bg-[#111111] px-6 pt-16 pb-8 border-b-4 border-[#CC0000] shadow-xl z-10 relative overflow-hidden">
                <View className="absolute right-0 top-0 opacity-5 w-full h-full justify-center items-center">
                    <FontAwesome5 name="exclamation-triangle" size={180} color="#FFFFFF" />
                </View>
                <View className="flex-row items-center mb-6 z-10">
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back()
                            } else {
                                router.replace('/(tabs)/perfil')
                            }
                        }}
                        className="w-10 h-10 bg-white/10 items-center justify-center rounded-sm mr-4 border border-white/20"
                    >
                        <Feather name="arrow-left" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xs font-black text-[#CC0000] tracking-widest uppercase mb-1">Centro de Treinamento</Text>
                        <Text className="text-3xl font-black text-white tracking-tighter uppercase">Regras Internas</Text>
                    </View>
                </View>
                <Text className="text-sm font-medium text-slate-400 leading-relaxed max-w-sm">
                    A disciplina é a base da evolução. A leitura e cumprimento integral destas diretrizes é obrigatória para todos os atletas matriculados.
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="px-6 pt-8">

                    {/* Alerta Inicial */}
                    <View className="bg-red-50 border-l-4 border-[#CC0000] p-4 mb-8">
                        <View className="flex-row items-center mb-2">
                            <Feather name="alert-circle" size={18} color="#CC0000" />
                            <Text className="text-sm font-black text-[#CC0000] uppercase tracking-widest ml-2">Atenção Plena</Text>
                        </View>
                        <Text className="text-red-900 text-sm font-medium leading-relaxed">
                            O não cumprimento das normas abaixo pode resultar em advertência, suspensão ou desligamento imediato do Centro de Treinamento sem aviso prévio.
                        </Text>
                    </View>

                    {/* Regra 1 */}
                    <View className="mb-10">
                        <View className="flex-row items-center mb-4 border-b border-slate-200 pb-2">
                            <Text className="text-xl font-black text-[#111111] uppercase tracking-tight">1. Vestimenta e Equipamentos</Text>
                        </View>
                        <View className="space-y-3">
                            <RegraItem texto="Não é permitido treinar com tênis de corrida (apenas sapatilhas, descalço ou com meias)." />
                            <RegraItem texto="Não é permitido treinar com roupas curtas ou sem camisa." />
                            <RegraItem texto="Não é permitido uso de Havaianas e patinete elétrico (sujeito a punição)." />
                            <RegraItem bold="NÃO É PERMITIDO ROUPAS COLORIDAS, FLORIDAS, SEM EXCEÇÕES." texto=" Não é permitido treinar com vestimentas de outras modalidades (esportes) ou outras academias. APENAS VESTIMENTAS DE TONALIDADES ESCURAS, NEUTRAS." />
                            <RegraItem texto="Não permitimos qualquer marca de luvas e não permitimos luvas menores de 14 onças (antes de comprar a sua, fale com o professor)." />
                        </View>
                    </View>

                    {/* Regra 2 */}
                    <View className="mb-10">
                        <View className="flex-row items-center mb-4 border-b border-slate-200 pb-2">
                            <Text className="text-xl font-black text-[#111111] uppercase tracking-tight">2. Pontualidade e Acesso</Text>
                        </View>
                        <View className="space-y-3">
                            <RegraItem texto="Chegue 10 minutos antes do horário da aula. Não toleraremos atrasos." />
                            <RegraItem texto="Não ultrapasse a corrente vermelha antes do horário de início da sua aula (caso seja necessário, peça permissão)." />
                            <RegraItem texto="Para participar das aulas é obrigatório realizar o check-in." />
                        </View>
                    </View>

                    {/* Regra 3 */}
                    <View className="mb-10">
                        <View className="flex-row items-center mb-4 border-b border-slate-200 pb-2">
                            <Text className="text-xl font-black text-[#111111] uppercase tracking-tight">3. Ambiente da Academia</Text>
                        </View>
                        <View className="space-y-3">
                            <RegraItem texto="Não permitimos acompanhantes e ou terceiros no ambiente da academia." />
                            <RegraItem bold="Aqui dentro, existe apenas uma voz: a do professor." texto=" (Não converse, não atrapalhe a aula)." />
                            <RegraItem texto="Colabore com a organização e disciplina do ambiente." />
                            <RegraItem texto="Não treine perfumado." />
                            <RegraItem texto="Traga sua garrafa d'água." />
                            <RegraItem texto="As aulas são com acompanhamento. Não faça nada que não lhe tenha sido direcionado." />
                            <RegraItem texto="Traga seu celular carregado de casa (aprenda a se organizar)." />
                            <RegraItem texto="Não somos uma cooperativa (não queremos sua opinião)." />
                        </View>
                    </View>

                    {/* Regra 4 */}
                    <View className="mb-10">
                        <View className="flex-row items-center mb-4 border-b border-slate-200 pb-2">
                            <Text className="text-xl font-black text-[#111111] uppercase tracking-tight">4. Convivência e Respeito</Text>
                        </View>
                        <View className="space-y-3">
                            <RegraItem texto="Somos uma equipe. Não toleramos competições internas ou qualquer tipo de falta de respeito entre alunos." />
                            <RegraItem texto="Intimidade é uma merda: não quero ser seu amigo." />
                            <RegraItem texto="Quer conversar? Vai pro barzinho." />
                            <RegraItem texto="Não quer ouvir esporro? Não faça perguntas idiotas." />
                        </View>
                    </View>

                    {/* Regra 5 */}
                    <View className="mb-10">
                        <View className="flex-row items-center mb-4 border-b border-slate-200 pb-2">
                            <Text className="text-xl font-black text-[#111111] uppercase tracking-tight">5. Postura e Comprometimento</Text>
                        </View>
                        <View className="space-y-3">
                            <RegraItem texto="Se o professor falou, apenas faça." />
                            <RegraItem texto="Tudo o que você sabe ou viu na internet, aqui dentro não importa. Não dê sua opinião sem ser solicitado." />
                            <RegraItem texto="Se não aguenta o tranco, pede pra sair. Não faça corpo mole." />
                            <RegraItem texto="Não chame o professor de mestre." />
                            <RegraItem texto="Não reverencie o tatame." />
                        </View>
                    </View>

                    {/* Regra 6 */}
                    <View className="mb-10">
                        <View className="flex-row items-center mb-4 border-b border-slate-200 pb-2">
                            <Text className="text-xl font-black text-[#CC0000] uppercase tracking-tight">6. Condutas Proibidas</Text>
                        </View>
                        <View className="space-y-3">
                            <RegraItem texto="Proibido cagar no banheiro da academia. (Não sou seu empregado)." />
                            <RegraItem texto="Não aceitamos vínculos com outras equipes ou academias." />
                            <RegraItem texto="Não traga problemas pessoais para a academia. Quer desabafar? Procure um psicólogo." />
                            <RegraItem texto='Não pronuncie a palavra com "D".' />
                        </View>
                    </View>

                    <View className="bg-slate-900 justify-center items-center py-8 px-6 border-l-4 border-slate-700">
                        <FontAwesome5 name="gavel" size={24} color="#64748B" className="mb-4" />
                        <Text className="text-slate-300 font-bold text-center leading-relaxed tracking-wide text-sm uppercase">
                            Caso não esteja satisfeito com estas normas, peça sua rescisão no balcão.
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

function RegraItem({ texto, bold }: { texto: string, bold?: string }) {
    return (
        <View className="flex-row items-start mb-3">
            <View className="w-2 h-2 rounded-sm bg-[#CC0000] mt-1.5 mr-3" />
            <Text className="flex-1 text-sm text-[#333333] font-medium leading-relaxed">
                {bold && <Text className="font-black text-[#111111]">{bold}</Text>}
                {texto}
            </Text>
        </View>
    );
}
