(function(){
   'use strict';

   // === INIT ===

   // Elements
   const footer = document.querySelector('footer');
   const actionArea = document.getElementById('actions');
   const drawButton = document.getElementById('draw');
   const start = document.getElementById('start');
   const startButton = document.getElementById('startGame');
   const quitButton = document.getElementById('quit');
   const helpButton = document.getElementById('help');
   const popup = document.getElementById('popup');
   const doneButton = document.querySelector('#popup button');
   const playerHand = document.getElementById('player');
   const dealerHand = document.getElementById('dealer');
   const gameStatus = document.getElementById('gameStatus');
   const handsPanel = document.getElementById('hands');
   const bankPanel = document.getElementById('bank');
   const betUp = document.getElementById('betUp');
   const betDown = document.getElementById('betDown');
   const betAmountDisplay = document.querySelector('#betAmount div');
   const bankAmountDisplay = document.querySelector('#bank section div');
   const payoutDisplay = document.getElementById('payout');

   // Audio
   const beginSound = new Audio('media/begin.mp3');
   const cardDealSound = new Audio('media/cardDeal.mp3');
   const tadaSound = new Audio('media/tada.mp3');
   const tromboneSound = new Audio('media/fail-trombone.mp3');
   beginSound.volume = 0.5;
   tadaSound.volume = 0.7;

   // Card Icons
   const cardIcons = [
      'Star.svg',
      'Circle.svg',
      'Triangle.svg',
      'Heart.svg',
      'Diamond.svg',
      'Club.svg',
      'Spade.svg'
   ];

   // Payout Multipliers on Win
   const payoutMultipliers = [
      1,   // Junk
      2,   // 1 Pair
      3,   // 2 Pair
      4,   // 3oaK
      6,   // Full House
      8,   // 4oaK
      16,  // 5oaK
   ];


   /// === ENUMS ===

   const outcomes = {
      Player: 'You Win!',
      Dealer: 'Too Bad',
      Tie: 'Wow, a Tie!'
   }

   const handTypes = {
      None: 0,
      OnePair: 1,
      TwoPair: 2,
      ThreeOfAKind: 3,
      FullHouse: 4,
      FourOfAKind: 5,
      FiveOfAKind: 6
   }


   /// === HAND CLASS ===

   class Hand {
      constructor(cards) {
         this.cards = cards;
         this.counts = this.countCards();
         
         this.singles = [];
         this.pairs = [];
         this.three = 0;
         this.four = 0;
         this.five = 0;

         this.calcGroupings();

         this.type = this.determineType();
      }

      // Count the number of cards for each value
      // Returns array of size 6
      countCards() {
         let counts = Array(6).fill(0);
         for (const card of this.cards) {
            counts[card - 1]++;
         }
         return counts;
      }

      // Calculate the groupings (singles, pairs, etc.)
      calcGroupings() {
         for (let i = 5; i >= 0; i--) {
            const count = this.counts[i];
            const cardVal = i + 1;

            switch (count) {
            case 5:
               this.five = cardVal;
               break;
            case 4:
               this.four = cardVal;
               break;
            case 3:
               this.three = cardVal;
               break;
            case 2:
               this.pairs.push(cardVal);
               break;
            case 1:
               this.singles.push(cardVal);
               break;
            }
            
         }
      }

      // Determine hand type
      determineType() {
         if (this.five != 0)                return handTypes.FiveOfAKind;
         else if (this.four != 0)           return handTypes.FourOfAKind;
         else if (this.three != 0) {
            if (this.pairs.length != 0)     return handTypes.FullHouse;
            else                            return handTypes.ThreeOfAKind;
         }
         else if (this.pairs.length === 2)  return handTypes.TwoPair;
         else if (this.pairs.length === 1)  return handTypes.OnePair;
         else                               return handTypes.None;
      }
   }


   // === GAME DATA ===

   let gameData = {
      // 0 for face-down, 1-6 for face-up
      cards: {
         player: [],
         dealer: []
      },
      numCardsSelected: 0,
      bankAmount: 105,
      betAmount: 5
   };


   // === START/DONE BUTTON ===

   startButton.addEventListener('click', startGame);

   function startGame() {
      startButton.removeEventListener('click', startGame);

      quitButton.removeAttribute('hidden');
      helpButton.removeAttribute('hidden');
      handsPanel.removeAttribute('hidden');
      bankPanel.removeAttribute('hidden');
      start.style.display = 'none';
      footer.toggleAttribute('hidden');

      // Reload when pushing quit button
      document.getElementById('quit').addEventListener('click', function() {
         location.reload();
      });

      setUpRound();
   }

   // Popup toggling
   helpButton.addEventListener('click', function() {
      popup.removeAttribute('hidden');
   });
   doneButton.addEventListener('click', function() {
      popup.toggleAttribute('hidden');
   });


   /// === MAIN GAMEPLAY LOOP ===

   // Set up the round
   function setUpRound() {
      beginSound.play();
      dealCards();

      // Set up player actions
      actionArea.removeAttribute('hidden');
      actionArea.style.display = 'flex';

      // Remove default bet amount from bank
      gameData.bankAmount -= gameData.betAmount;
      bankAmountDisplay.innerHTML = ` × ${gameData.bankAmount}`;
   }

   // When player pushes draw button
   drawButton.addEventListener('click', drawButtonPush);
   function drawButtonPush() {
      // Make all player cards unselectable
      for (const card of playerHand.children) {
         card.classList.remove('selectable');
         card.removeEventListener('click', toggleCardSelect);
      }
      actionArea.toggleAttribute('hidden');
      actionArea.style.display = 'none';

      replacePlayerCards();
      dealerDrawCards();
      // replaceAllCards(); // FOR TESTING ONLY

      // Generate Hand objects
      const hands = {
         player: new Hand(gameData.cards.player),
         dealer: new Hand(gameData.cards.dealer)
      }
      console.log(hands);
      
      showHands(hands);
      showHandDescriptions(hands);
      const winner = pickWinner(hands);
      displayWinner(winner);

      if (winner === outcomes.Player) {
         payout(hands.player.type);
      }
   }

   // Betting Button Event Listeners
   betUp.addEventListener('click', function() {
      if(gameData.betAmount < 5) {
         gameData.betAmount++;
         gameData.bankAmount--;
         updateGemDisplays();
      }
   });
   betDown.addEventListener('click', function() {
      if (gameData.betAmount > 1) {
         gameData.betAmount--;
         gameData.bankAmount++;
         updateGemDisplays();
      }
   });
   function updateGemDisplays() {
      betAmountDisplay.innerHTML = ` × ${gameData.betAmount}`;
      bankAmountDisplay.innerHTML = ` × ${gameData.bankAmount}`;
   }

   // When player pushes "Play Again" button
   function reset() {
      gameData.cards.player.splice(0);
      gameData.cards.dealer.splice(0);
      gameData.numCardsSelected = 0;
      gameData.betAmount = 5;
      playerHand.innerHTML = '';
      dealerHand.innerHTML = '';
      gameStatus.innerHTML = '';
      payoutDisplay.innerHTML = '';
      drawButton.innerHTML = 'Hold';
      betAmountDisplay.innerHTML = ' × 5';

      setUpRound();
   }


   // === GAME HELPERS ===

   function dealCards() {
      // Randomly determine and construct cards
      for (let i = 0; i < 5; i++) {
         // Make dealer card
         const dealerCardVal = Math.floor(Math.random() * 6) + 1;
         gameData.cards.dealer.push(dealerCardVal);
         const dealerCard = document.createElement('div');
         dealerCard.className = `card c${i} faceDown`;
         dealerCard.innerHTML = `<img src="images/${cardIcons[0]}">`;

         // for testing dealer AI
         // dealerCard.innerHTML = `${dealerCardVal}<img src="images/${cardIcons[dealerCardVal]}">`;

         dealerHand.appendChild(dealerCard);

         // Make player card
         const playerCardVal = Math.floor(Math.random() * 6) + 1;
         gameData.cards.player.push(playerCardVal);
         const playerCard = document.createElement('div');
         playerCard.className = `card c${i} selectable`;
         playerCard.innerHTML = `${playerCardVal}<img src="images/${cardIcons[playerCardVal]}">`;
         playerHand.appendChild(playerCard);

         // Add click listener to player card for selecting
         playerCard.addEventListener('click', toggleCardSelect);
      }
   }

   function toggleCardSelect(event) {
      cardDealSound.play();

      let playerCard = event.target;

      // fix image-clicking issue
      if (playerCard.parentElement.classList.contains('card')) {
         playerCard = playerCard.parentElement;
      }

      if (playerCard.classList.contains('selected')) {
         playerCard.classList.remove('selected');
         gameData.numCardsSelected--;
         if (gameData.numCardsSelected === 0) {
            drawButton.innerHTML = 'Hold';
         }
      }
      else {
         playerCard.classList.add('selected');
         if (gameData.numCardsSelected === 0) {
            drawButton.innerHTML = 'Draw';
         }
         gameData.numCardsSelected++;
      }
   }

   function replacePlayerCards() {
      const playerCards = playerHand.children;
      for (let i = 0; i < playerCards.length; i++) {
         const card = playerCards[i];
         if (card.classList.contains('selected')) {
            const newVal = Math.floor(Math.random() * 6) + 1;
            gameData.cards.player[i] = newVal;

            card.classList.remove('selected');
            card.innerHTML = `${newVal}<img src="images/${cardIcons[newVal]}">`;
         }
      }
   }

   function dealerDrawCards() {
      // count cards
      let counts = Array(6).fill(0);
      for (const card of gameData.cards.dealer) {
         counts[card - 1]++;
      }

      gameData.cards.dealer.forEach(function(cardVal, i) {
         if (counts[cardVal - 1] == 1) {
            const newVal = Math.floor(Math.random() * 6) + 1;
            gameData.cards.dealer[i] = newVal;
            
            // face-up testing only
            // dealerHand.children[i].innerHTML = `${newVal}<img src="images/${cardIcons[newVal]}">`;
         }
      });
   }

   function showHands(hands) {
      for (let i = 0; i < 5; i++) {
         const dealerCard = dealerHand.children[i];
         const dealerCardVal = hands.dealer.cards[i];
         dealerCard.classList.remove('faceDown');
         
         // For testing
         dealerCard.innerHTML = `${dealerCardVal}<img src="images/${cardIcons[dealerCardVal]}">`
      }
   }

   function showHandDescriptions(hands) {
      const playerTypeString = getTypeString(hands.player);
      const dealerTypeString = getTypeString(hands.dealer);
      playerHand.innerHTML += `<p>${playerTypeString}</p>`;
      dealerHand.innerHTML += `<p>${dealerTypeString}</p>`;
   }

   function getTypeString(hand) {
      switch(hand.type) {
      case handTypes.FiveOfAKind:
         return `Five of a Kind (${hand.five})`;
      case handTypes.FourOfAKind:
         return `Four of a Kind (${hand.four})`;
      case handTypes.FullHouse:
         return `Full House (${hand.three}, ${hand.pairs[0]})`;
      case handTypes.ThreeOfAKind:
         return `Three of a Kind (${hand.three})`;
      case handTypes.TwoPair:
         return `Two Pairs (${Math.max(...hand.pairs)}, ${Math.min(...hand.pairs)})`;
      case handTypes.OnePair:
         return `Pair (${hand.pairs[0]})`;
      default:
         return `Junk`;
      }
   }

   function displayWinner(winnerString) {
      gameStatus.innerHTML = `<h2>${winnerString}</h2>`;
      gameStatus.innerHTML += `<button id="reset">Play Again</button>`;
      document.getElementById('reset').addEventListener('click', reset);

      switch(winnerString) {
      case outcomes.Player: 
         tadaSound.play(); 
         document.querySelector('#gameStatus h2').className = 'win';
         break;
      case outcomes.Dealer: 
         tromboneSound.play(); 
         document.querySelector('#gameStatus h2').className = 'lose';
         break;
      default: // TODO: Find sound for tie
      }
   }

   function payout(playerHandType) {
      gameData.bankAmount += gameData.betAmount * payoutMultipliers[playerHandType];
      
      payoutDisplay.innerHTML = `<img src="images/Gem.svg">`;
      payoutDisplay.innerHTML += `<p>+${gameData.betAmount * payoutMultipliers[playerHandType]} (<span class="betAmount">${gameData.betAmount}</span> × <span class="multiplier">${payoutMultipliers[playerHandType]}</span>)</p>`
      bankAmountDisplay.innerHTML = ` × ${gameData.bankAmount}`;
   }


   // === WINNER CALCULATION FUNCTIONS ===

   function pickWinner(hands) {
      if (hands.player.type > hands.dealer.type) {
         // Player wins
         return outcomes.Player;
      }
      else if (hands.player.type < hands.dealer.type) {
         // Dealer wins
         return outcomes.Dealer;
      }
      else {
         // Same hand type
         const handType = hands.player.type;

         // Determine winner based on card values
         // return pickWinnerWithSameHandType(hands, handType);


         switch (handType) {
         case handTypes.FiveOfAKind:
            if (hands.player.five > hands.dealer.five) {
               return outcomes.Player;
            }
            else if (hands.player.five < hands.dealer.five) {
               return outcomes.Dealer;
            }
            else {
               return outcomes.Tie;
            }

         case handTypes.FourOfAKind:
            if (hands.player.four > hands.dealer.four) {
               return outcomes.Player;
            }
            else if (hands.player.four < hands.dealer.four) {
               return outcomes.Dealer;
            }
            else {
               return compareSingles(hands);
            }

         case handTypes.FullHouse:
            if (hands.player.three > hands.dealer.three) {
               return outcomes.Player;
            }
            else if (hands.player.three < hands.dealer.three) {
               return outcomes.Dealer;
            }
            else {
               if (hands.player.pairs[0] > hands.dealer.pairs[0]) {
                  return outcomes.Player;
               }
               else if (hands.player.pairs[0] < hands.dealer.pairs[0]) {
                  return outcomes.Dealer;
               }
               else {
                  return outcomes.Tie;
               }
            }

         case handTypes.ThreeOfAKind:
            if (hands.player.three > hands.dealer.three) {
               return outcomes.Player;
            }
            else if (hands.player.three < hands.dealer.three) {
               return outcomes.Dealer;
            }
            else {
               return compareSingles(hands);
            }

         case handTypes.TwoPair:
            if (Math.max(...hands.player.pairs) > Math.max(...hands.dealer.pairs)) {
               return outcomes.Player;
            }
            else if (Math.max(...hands.player.pairs) < Math.max(...hands.dealer.pairs)) {
               return outcomes.Dealer;
            }
            else {
               if (Math.min(...hands.player.pairs) > Math.min(...hands.dealer.pairs)) {
                  return outcomes.Player;
               }
               else if (Math.min(...hands.player.pairs) < Math.min(...hands.dealer.pairs)) {
                  return outcomes.Dealer;
               }
               else {
                  return compareSingles(hands);
               }
            }

         case handTypes.OnePair:
            if (hands.player.pairs[0] > hands.dealer.pairs[0]) {
               return outcomes.Player;
            }
            else if (hands.player.pairs[0] < hands.dealer.pairs[0]) {
               return outcomes.Dealer;
            }
            else {
               return compareSingles(hands);
            }

         default: 
            return compareSingles(hands);

         }
      }
   }

   function compareSingles(hands) {
      const playerSingles = hands.player.singles;
      const dealerSingles = hands.dealer.singles;

      // Player and dealer have same number of singles
      const numSingles = playerSingles.length;

      for (let i = 0; i < numSingles; i++) {
         if (playerSingles[i] > dealerSingles[i]) {
            return outcomes.Player;
         }
         else if (playerSingles[i] < dealerSingles[i]) {
            return outcomes.Dealer;
         }
      }

      return outcomes.Tie;
   }

   
   /// === TESTING ONLY ===

   // Replace all cards with specified values
   function replaceAllCards() {
      // Set new card values
      gameData.cards.dealer = [1, 2, 3, 4, 5];
      gameData.cards.player = [1, 2, 3, 4, 6];

      // Redo player's cards
      const playerCards = playerHand.children;
      for (let i = 0; i < playerCards.length; i++) {
         const card = playerCards[i];
         const newVal = gameData.cards.player[i];
         card.innerHTML = `${newVal}<img src="images/${cardIcons[newVal]}">`;
      }
   }

})();