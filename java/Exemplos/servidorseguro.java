package Exemplos;

import java.net.*;
import java.security.*;
import java.io.*;
import javax.crypto.Cipher;
public class servidorseguro {

    public static void main(String[] args) throws Exception {
        ServerSocket server = new ServerSocket(7777);
        Socket conexaoCliente = server.accept();
        
        DataInputStream entrada = new DataInputStream(conexaoCliente.getInputStream());
        
        Key chave;
        ObjectInputStream in = new ObjectInputStream(new FileInputStream("Chave.key"));
        chave = (Key)in.readObject();
        in.close(); 
        
        Cipher decipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        decipher.init(Cipher.DECRYPT_MODE, chave);
        
        int tamanho = entrada.readInt();
        if (tamanho > 0) {
            byte[] dadosCifrados = new byte[tamanho];
            entrada.readFully(dadosCifrados, 0, dadosCifrados.length);
            System.out.println("Mensagem recebida: " + new String(dadosCifrados));
            byte[] dadosDecifrados = decipher.doFinal(dadosCifrados);
            System.out.println("Mensagem decifrada: " + new String(dadosDecifrados));
        }
        
        
        
    }
    
}
