document.getElementById('generate-btn').addEventListener('click', async () => {
    const ingredients = document.getElementById('ingredients').value;
    const cuisine = document.getElementById('cuisine').value;
    const dietary = document.getElementById('dietary').value;
    const userEmail = localStorage.getItem('userEmail'); // Retrieved from login
    const output = document.getElementById('recipe-output');

    if (!ingredients) {
        alert("Please enter some ingredients!");
        return;
    }

    output.innerHTML = '<div class="recipe-card"><p><span class="spinner"></span>SpiceSpark is thinking...</p></div>';

    try {
        const response = await fetch('/api/generate-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients, cuisine, dietary, userEmail })
        });

        const data = await response.json();
        
        if (data.recipes) {
            // Convert simple markdown-like bold to HTML bold
            const formattedRecipe = data.recipes.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            output.innerHTML = `
                <div class="recipe-card animated-in">
                    <h3>Your Custom Recipe</h3>
                    <div class="recipe-content">${formattedRecipe.replace(/\n/g, '<br>')}</div>
                </div>`;
        } else {
            output.innerHTML = '<p>Error generating recipe. Try again.</p>';
        }
    } catch (error) {
        output.innerHTML = '<p>Server error. Make sure you are logged in.</p>';
    }
});