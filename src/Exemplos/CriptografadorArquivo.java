package Exemplos;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.security.Key;
import javax.crypto.Cipher;

public class CriptografadorArquivo {
    public static void main(String[] args) throws Exception{
        Key chave;

        ObjectInputStream in = new ObjectInputStream(new FileInputStream("Chave.key"));
        chave = (Key)in.readObject();
        in.close(); 

        Cipher algoritmo = Cipher.getInstance("DES/ECB/PKCS5Padding");
        algoritmo.init(Cipher.ENCRYPT_MODE, chave);
        
        System.out.println("Digite uma mensagem a ser cifrada: ");
        String mensagem = new java.util.Scanner(System.in).nextLine();
        
        byte[] bytesMensagem = mensagem.getBytes("UTF8");
        
        byte[] dadosCifrados = algoritmo.doFinal(bytesMensagem);
        
        System.out.println(new String(dadosCifrados));
        
        ObjectOutputStream arquivoCifrado = 
                new ObjectOutputStream(new FileOutputStream("MensagemSecreta.des"));
        arquivoCifrado.writeObject(dadosCifrados);
        arquivoCifrado.close();
        
    }
}
