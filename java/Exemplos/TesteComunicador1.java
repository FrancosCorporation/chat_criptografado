package Exemplos;
import java.security.Key;
import java.util.Scanner;

public class TesteComunicador1 {

    public static void main(String[] args) throws Exception {
        ComunicadorSeguro com = new ComunicadorSeguro();
        Key chave = com.obterChave("Chave.key");

        System.out.println("Escolha o modo de funcionamento: ");
        System.out.println("1 - Servidor");
        System.out.println("2 - Cliente ");
        System.out.print("Escolha a opção desejada: ");
        int opcao = new Scanner(System.in).nextInt();

        if (opcao == 1) {
            //Servidor
            com.servidor(7777);
            System.out.println("Servidor conectado na porta 7777");
            /*CRIAR LAÇO DE REPETICAO NO SERVIDOR*/
            while (!com.isConexaoServidor()) {
                byte[] dados = com.receberDados();
                String mensagem = new String(dados);
                com.escreverMensagem(mensagem);
            }
        } else if (opcao == 2) {
            //Cliente
            com.cliente("localhost", 8888);
            System.out.println("Conexão com o servidor estabelecida com sucesso!");
            /*CRIAR LAÇO DE REPETICAO NO CLIENTE*/
            while (com.isConexaoClient()) {
                String mensagem = com.lerMensagem();
                com.enviarDados(mensagem.getBytes());
            }
        }
    }

}
