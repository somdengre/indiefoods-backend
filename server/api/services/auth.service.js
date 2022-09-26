import { database } from '../../common/firebase';
import l from '../../common/logger';

// import * as HelloSignSDK from 'hellosign-sdk';
const HELLOSIGN_CLIENT_ID = '82f4b30c336f28a6a32849b208d4c2ff';
const HELLOSIGN_API_KEY =
  '723d0a84cc0aaf41468ce9725cccbae9aa719828569364e398700f3b9b4ef312';
const HELLOSIGN_TEMPLATE_ID = '25bd3cdbe21ce74730f57ca089a23087dec2dc42';

var hellosign = require('hellosign-sdk')({
  key: HELLOSIGN_API_KEY,
  client_id: HELLOSIGN_CLIENT_ID,
});

const CHEF_ROLE = 'CHEF';
// const api = new HelloSignSDK.SignatureRequestApi();

// Configure HTTP basic authorization: api_key
// api.username = HELLOSIGN_API_KEY;

// or, configure Bearer (JWT) authorization: oauth2
// $config->setAccessToken("YOUR_ACCESS_TOKEN");

class AuthService {
  userCollectionRef = database.collection('users');
  chefCollectionRef = database.collection('chefs');
  async signupUser(name, phone, address, email, uid) {
    try {
      const chefUser = await this.chefCollectionRef.doc(uid).get();
      if (chefUser.exists) throw new Error('Already signed up as a chef');
      await this.userCollectionRef.doc(uid).set({
        name,
        phone,
        address,
        email,
        createdAt: new Date(),
      });
      return { message: 'User registered successfully' };
    } catch (error) {
      l.error('[SIGNUP SERVICE USER]', error);
      throw error;
    }
  }
  async signupChef(name, phone, address, fssaiId, foodTypes, email, uid) {
    try {
      const user = await this.userCollectionRef.doc(uid).get();
      if (user.exists) throw new Error('Already signed up as a foodie');

      //

      // const signer1 = {
      //   role: CHEF_ROLE,
      //   emailAddress: email,
      //   name: name,
      // };

      // const signingOptions = {
      //   draw: true,
      //   type: true,
      //   upload: true,
      //   phone: false,
      //   defaultType: 'draw',
      // };

      // const data = {
      //   clientId: HELLOSIGN_CLIENT_ID,
      //   templateIds: [HELLOSIGN_TEMPLATE_ID],
      //   subject: 'Food safety and standards agreement',
      //   message: 'Glad we could come to an agreement.',
      //   signers: [signer1],
      //   signingOptions,
      //   testMode: true,
      // };
      // const result = await api.signatureRequestCreateEmbeddedWithTemplate(data);

      var signers = [
        {
          email_address: email,
          name: name,
          role: CHEF_ROLE,
        },
      ];

      var options = {
        test_mode: 1,
        template_id: [HELLOSIGN_TEMPLATE_ID],
        subject: 'Food safety and standards agreement',
        message: 'Glad we could come to an agreement.',

        signers: signers,
        // custom_fields: [
        //   {
        //     name: 'start_date',
        //     value: '01/10/2016',
        //     editor: 'Signer',
        //     required: true,
        //   },
        // ],
      };

      const result =
        await hellosign.signatureRequest.createEmbeddedWithTemplate(options);
      const signature_id = result.signature_request.signatures[0].signature_id;
      const embedded_signature_url_res = await hellosign.embedded.getSignUrl(
        signature_id
      );

      const embedded_signature_url =
        embedded_signature_url_res.embedded.sign_url;

      console.log('embedded_signature_url', embedded_signature_url);
      console.log(result);

      await this.chefCollectionRef.doc(uid).set({
        name,
        phone,
        address,
        fssaiId,
        foodTypes,
        profilePicture:
          'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hlZnxlbnwwfHwwfHw%3D&w=1000&q=80',
        pricing: {
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snacks: 0,
        },
        email,
        isChef: true,
        createdAt: new Date(),
        signature_request: result.signature_request,
        signature_url: embedded_signature_url,
        hasSigned: false,
      });
      return {
        message: 'Chef registered successfully',
        signature_request: result.signature_request,
        signature_url: embedded_signature_url,
      };
    } catch (error) {
      l.error('[SIGNUP SERVICE CHEF]', error);
      throw error;
    }
  }

  async getUser(uid) {
    try {
      const user = await this.userCollectionRef.doc(uid).get();
      const chef = await this.chefCollectionRef.doc(uid).get();
      if (user.exists) {
        return user.data();
      } else if (chef.exists) {
        return chef.data();
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      l.error('[GET USER]', error);
      throw error;
    }
  }
}

export default new AuthService();
