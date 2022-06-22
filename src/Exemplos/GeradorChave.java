package Exemplos;

import java.io.FileOutputStream;
import java.io.ObjectOutputStream;
import java.security.Key;
import java.security.SecureRandom;
import javax.crypto.KeyGenerator;

public class GeradorChave {

    public static void main(String[] args) throws Exception {
            Key chave; //Objeto que conterá a chave DES gerada
            
            //Criar um gerador de chaves para criar uma nova chave DES
            KeyGenerator gerador = KeyGenerator.getInstance("DES");
            
            //Iniciar o gerador com uma sequência de dados aleatórios
            gerador.init(new SecureRandom());
            
            //Gerar a chave DES 
            chave = gerador.generateKey();
            
            //Imprimir a chave no console
            System.out.println("Chave gerada: " + chave.getEncoded().toString());
            
            //Gravar a chave gerada em um arquivo chamado chave.key
            ObjectOutputStream arquivoChave = 
                    new ObjectOutputStream(new FileOutputStream("Chave.key"));
            arquivoChave.writeObject(chave);
            arquivoChave.close();
    }
    
}
