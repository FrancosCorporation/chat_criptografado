package Exemplos;
import java.io.*;
import java.security.Key;
import javax.crypto.Cipher;

public class Criptografador {
    public static void main(String[] args) throws Exception{
        //Carregar a chave do arquivo Chave.key
        //Criar um objeto para armazenar a chave
        Key chave;
        //Ler a chave do arquivo Chave.key
        ObjectInputStream in = 
        new ObjectInputStream(new FileInputStream("Chave.key"));
        chave = (Key)in.readObject();
        in.close(); 
        //Definir qual cifra será usada (DES)
        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, chave);
        
        System.out.println("Digite uma mensagem a ser cifrada: ");
        String mensagem = new java.util.Scanner(System.in).nextLine();
        
        byte[] bytesMensagem = mensagem.getBytes("UTF8");
        
        byte[] dadosCifrados = cipher.doFinal(bytesMensagem);
        
        System.out.println(new String(dadosCifrados));
    }
    
}
